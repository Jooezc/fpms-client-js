import WebSocket from 'ws';
import crypto from './crypto';

const ALIVE_DELAY = 30 * 1000; // 30秒
const PARTNER_ID_IOS = '14033'; // for iOS
const PARTNER_ID_ANDROID = '14542'; // for Android
const PARTNER_ID_H5 = '14543'; // for Web

export type OpenAPIConfig = {
  /** 服务器地址 */
  SERVERURL: string;
  /** 平台Id */
  PLATFORMID: string;
  /** partnerId */
  PARTNERID: string;
  /** 提供商Id */
  PROVIDERID: string;
  /** 域名 */
  WSCLIENTDOMAIN: string;
  /** 游戏Id */
  GAMEID: string;
  /** 设备类型 */
  DEVICETYPE: number;
  /** 客户端类型 */
  WSCLIENTTYPE: number;
};

export enum CertLang {
  Chinese = 1,
  English = 2,
  Vietnamese = 3,
  Thai = 4,
  Filipino = 5,
}

export enum SMSPurpose {
  PlayerLogin = 'playerLogin',
  Register = 'registration',
}

class FpmsConnector {
  private wsClient?: WebSocket;
  private apiConfig?: OpenAPIConfig;
  private requestId: number;
  private aliveInterval: number;
  private callbackMap: Map<number, Function>;
  private wsErrorHandler?: Function;
  private mdSalt: string = 'ApP$!gNa+URe';
  private isLogin: boolean;

  constructor() {
    this.isLogin = false;
    this.aliveInterval = 0;
    this.requestId = 0 | (Math.random() * 100000);
    this.callbackMap = new Map();
  }

  /**
   * 初始化配置
   * @param config
   */
  public initConfig(config: OpenAPIConfig) {
    this.apiConfig = config;
    this.initWsClient();
  }

  /**
   * 请求验证码
   * @param countryCode
   * @param phoneNum
   * @param purpose 请求验证码的用途: 登录 playerLogin, 注册 registration
   * @param callback
   */
  public getSMSCode(
    countryCode: string,
    phoneNum: string,
    purpose: string = SMSPurpose.PlayerLogin,
    callback?: Function,
  ) {
    if (!this.checkConfig(callback)) {
      return;
    }
    const reqSmsObj = {
      platformId: this.apiConfig!.PLATFORMID,
      phoneNumber: countryCode + phoneNum,
      purpose: purpose,
    };
    const cmdString = this.buildCommandString('player', 'getSMSCode', reqSmsObj, callback);
    this.send(cmdString, callback);
  }

  /**
   * 验证码注册或登录
   * @param deviceId 设备ID
   * @param countryCode
   * @param phoneNo
   * @param smsCode
   * @param captchaVerify Google 人机验证码
   * @param callback
   */
  public loginOrRegisterBySMS(
    deviceId: string,
    countryCode: string,
    phoneNo: string,
    smsCode: string,
    captchaVerify?: string,
    callback?: Function,
  ) {
    if (!this.checkConfig(callback)) {
      return;
    }
    const deviceType = this.apiConfig!.DEVICETYPE;
    const partnerId = deviceType === 3 ? PARTNER_ID_ANDROID : deviceType === 4 ? PARTNER_ID_IOS : PARTNER_ID_H5;
    const registerObj: { [key: string]: any } = {
      platformId: this.apiConfig!.PLATFORMID,
      partnerId: partnerId,
      phoneNumber: countryCode + phoneNo,
      smsCode: smsCode,
      deviceId: deviceId,
      deviceType: deviceType,
      longToken: true,
      domain: this.apiConfig!.WSCLIENTDOMAIN,
      captchaVerify: captchaVerify || '',
    };
    const self = this;
    const cmdString = this.buildCommandString(
      'player',
      'playerLoginOrRegisterWithSMS',
      registerObj,
      (result: any) => {
        if (result.status === 200) self.isLogin = true;
        if (callback) callback(result);
      },
      true,
    );
    this.send(cmdString, callback);
  }

  /**
   * 密码登录
   * @param deviceId 设备ID
   * @param countryCode
   * @param phoneNo
   * @param userPwd
   * @param captchaVerify Google 人机验证码
   * @param callback
   */
  public loginByPassword(
    deviceId: string,
    countryCode: string,
    phoneNo: string,
    userPwd: string,
    captchaVerify?: string,
    callback?: Function,
  ) {
    if (!this.checkConfig(callback)) {
      return;
    }
    const deviceType = this.apiConfig!.DEVICETYPE;
    const partnerId = deviceType === 3 ? PARTNER_ID_ANDROID : deviceType === 4 ? PARTNER_ID_IOS : PARTNER_ID_H5;
    const registerObj = {
      platformId: this.apiConfig!.PLATFORMID,
      partnerId: partnerId,
      phoneNumber: countryCode + phoneNo,
      captchaVerify: captchaVerify || '',
      password: userPwd,
      deviceId: deviceId,
      deviceType: deviceType,
      clientDomain: this.apiConfig!.WSCLIENTDOMAIN,
      longToken: true,
    };
    const self = this;
    const cmdString = this.buildCommandString(
      'player',
      'phoneNumberLoginWithPassword',
      registerObj,
      (result: any) => {
        if (result.status === 200) self.isLogin = true;
        if (callback) callback(result);
      },
      true,
    );
    this.send(cmdString, callback);
  }

  /**
   * token 登录
   * @param token
   * @param playerId
   * @param callback
   */
  public loginByToken(token: string, playerId: string, callback?: Function) {
    if (!this.checkConfig(callback)) {
      return;
    }
    this.wsErrorHandler = callback;
    const tokenObj = {
      playerId,
      token,
      clientDomain: this.apiConfig!.WSCLIENTDOMAIN,
      isLogin: true,
    };
    const self = this;
    const cmdString = this.buildCommandString(
      'player',
      'authenticate',
      tokenObj,
      (result: any) => {
        if (result.status === 200) self.isLogin = true;
        else if (result.status === 493) {
          // token 过期
          result.errorMessage = 'The account login has expired, please log in again.';
        }
        if (callback) callback(result);
      },
      true,
    );
    this.send(cmdString, callback);
  }

  /***
   * 获取 Google reCaptcha 验证是否开启, 如果开启，登录时需要填写 Google reCaptcha 验证
   * @param callback
   */
  public isGoogleCaptchaOpen(callback?: (enabled: boolean) => void) {
    if (!this.checkConfig(callback)) {
      return;
    }
    this.getConfig((result) => {
      if (result.status === 200 && result.data) {
        callback?.(result.data.captchaVerifyType === 1); // captchaVerifyType 为1时， 打开google验证
      } else {
        callback?.(false);
      }
    });
  }

  public isPlayerLogin() {
    return this.isLogin;
  }

  private getConfig(callback?: (result: any) => void) {
    const requestObj = {
      platformId: this.apiConfig!.PLATFORMID,
      device: 3,
    };
    const cmdString = this.buildCommandString('platform', 'getConfig', requestObj, callback);
    this.send(cmdString, callback);
  }

  private initWsClient() {
    try {
      const self = this;
      this.wsClient = new WebSocket(this.apiConfig!.SERVERURL);
      this.wsClient.onmessage = this.onMessage.bind(this);
      this.wsClient.onopen = () => {
        this.setLang();
      };
      this.wsClient.onerror = (event) => {
        console.log(`FPMS init ws onerror: ${JSON.stringify(event)}`);
      };
      // @ts-ignore
      this.aliveInterval = setInterval(() => {
        self.isAlive((result: any) => {
          console.log('sent alive result:', result);
        });
      }, ALIVE_DELAY);
      return this.wsClient;
    } catch (err: any) {
      console.log('init ws error: ', err);
    }
  }

  private async getWsClient(): Promise<WebSocket> {
    const self = this;
    const getSocket = new Promise<WebSocket>((resolve, reject) => {
      if (self.wsClient == undefined) {
        self.initWsClient();
      } else {
        if (self.isWsClientReady()) {
          resolve(self.wsClient);
          return;
        }
        if (self.wsClient.readyState === WebSocket.CONNECTING) {
          self.wsClient.onopen = () => {
            const cmdString = self.buildCommandString('connection', 'setLang', { lang: CertLang.English });
            self.wsClient?.send(cmdString);
            resolve(self.wsClient!);
          };
          self.wsClient.onerror = (error) => {
            console.log(`FPMS ws onerror: ${JSON.stringify(error)}`);
            this.wsErrorHandler?.(error);
            this.wsErrorHandler = undefined;
            reject(error);
          };
          return;
        }
        if (self.wsClient.readyState === WebSocket.CLOSING || self.wsClient.readyState === WebSocket.CLOSED) {
          self.isLogin = false;
          self.wsClient = new WebSocket(self.apiConfig!.SERVERURL);
          self.wsClient.onmessage = self.onMessage.bind(self);
          self.wsClient.onopen = () => {
            self.setLang();
          };
          self.wsClient.onerror = (error) => {
            console.log(`FPMS reconnect ws onerror: ${JSON.stringify(error)}`);
            this.wsErrorHandler?.(error);
            this.wsErrorHandler = undefined;
            reject(error);
          };
        }
      }
    });
    return getSocket;
  }

  public closeWsClient() {
    if (
      this.wsClient &&
      (this.wsClient.readyState === WebSocket.OPEN || this.wsClient.readyState === WebSocket.CONNECTING)
    )
      this.wsClient.close();
    this.callbackMap.clear();
    if (this.aliveInterval) clearInterval(this.aliveInterval);
  }

  private buildCommandString(
    service: string,
    funName: string,
    data: any = {},
    callback?: Function,
    needSign: boolean = false,
  ): string {
    const cmd = {
      service: service,
      functionName: funName,
      platformId: this.apiConfig!.PLATFORMID,
      requestId: this.getRequestId(),
      data: data,
    };
    if (callback) {
      this.callbackMap.set(cmd.requestId, callback);
    }
    if (needSign) {
      this.sign(cmd.data);
    }
    console.log('send cmd object:', JSON.stringify(cmd));
    return JSON.stringify(cmd);
  }

  private async send(message: string, losePacketHandler?: Function, retryCount: number = 0) {
    try {
      const wsClient = await this.getWsClient();
      wsClient.send(message);
    } catch (error: any) {
      if (retryCount < 2) {
        this.send(message, losePacketHandler, ++retryCount);
      } else {
        console.log('Websocket connect error:', JSON.stringify(error));
        if (error.code === 403) {
          losePacketHandler?.({
            status: 100001,
            errorMessage: 'Service is for users residing in the Phillippines only.',
          });
        } else {
          losePacketHandler?.({ status: 100002, errorMessage: 'Unable to connect the server.' });
        }
      }
    }
  }

  private onMessage(event: WebSocket.MessageEvent) {
    if (event) {
      console.log('onMessage: ', event.data);
      try {
        const stringData = event.data as string;
        const respObj = JSON.parse(stringData);
        const callback = this.callbackMap.get(respObj.requestId);
        callback?.(respObj.data);
      } catch (err: any) {
        console.log('parse json string error.' + err.toString());
      }
    }
  }

  private setLang(lang: CertLang = CertLang.English, callback?: Function) {
    const cmdString = this.buildCommandString('connection', 'setLang', { lang: lang }, callback);
    this.send(cmdString, callback);
  }

  private isWsClientReady(): boolean {
    if (!this.wsClient) return false;
    return this.wsClient && this.wsClient.readyState === WebSocket.OPEN;
  }

  private isAlive(callback?: Function) {
    const cmdString = this.buildCommandString('connection', 'isAlive', {}, callback);
    this.send(cmdString, callback);
  }

  private getRequestId() {
    return this.requestId++;
  }

  private checkConfig(complete?: Function): boolean {
    if (!this.apiConfig) {
      complete?.({
        status: 100000,
        errorMessage: 'SDK not initialized.',
      });
      return false;
    }
    return true;
  }

  private getAbc(dataObj: any): string {
    if (!dataObj) return '';
    try {
      const txtStr = JSON.stringify(dataObj);
      const key = crypto.MD5(this.mdSalt).toString(crypto.enc.Hex);
      const retStr = crypto.enc.Base64.stringify(crypto.HmacSHA256(txtStr, key));
      console.log(key, txtStr, retStr);
      return retStr;
    } catch (err) {
      console.error(err);
      return '';
    }
  }

  private sign(dataObj: any): any {
    if (dataObj && this.apiConfig) {
      if (dataObj.deviceType === undefined) dataObj.deviceType = this.apiConfig.DEVICETYPE;
      const copyData = JSON.parse(JSON.stringify(dataObj));
      delete copyData.requestId;
      dataObj.signature = this.getAbc(copyData);
    }
    return dataObj;
  }
}

export const fpms = new FpmsConnector();
