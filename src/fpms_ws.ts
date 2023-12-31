import crypto from 'crypto-js';

const ALIVE_DELAY = 30 * 1000; // 30秒
const PARTNER_ID_IOS = '14033'; // for iOS
const PARTNER_ID_ANDROID = '14542'; // for Android
const PARTNER_ID_H5 = '14543'; // for Web

export type FPCallback = (res: FPResponse) => void;

export type OpenAPIConfig = {
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

/** 语言 */
export enum CertLang {
  Chinese = 1,
  English = 2,
  Vietnamese = 3,
  Thai = 4,
  Filipino = 5,
}

/** 获取验证码用途 */
export enum SMSPurpose {
  PlayerLogin = 'playerLogin',
  Register = 'registration',
}

/** Player */
export interface ICertPlayer {
  playerId?: string;
  token?: string;
  IDstatus?: number;
  phoneNumber?: string;
  phoneType?: string;
  nickName?: string;
  nationality?: string;
  province?: string;
  playerCity?: string;
  name?: string;
  gender?: boolean;
  fullEmail?: string;
  registrationTime?: string;
  sourceOfFunds?: string;
  userCurrentPoint?: number;
  isCompleteInfo?: boolean;
  isLogin?: boolean;
  isRegister?: boolean;
  isGLife?: boolean;
  isTestPlayer?: boolean;

  [key: string]: any;
}

export interface FPResponse {
  status: number;
  data?: ICertPlayer;
  errorMessage?: string;
}

class FpmsWs {
  /** Websocket 对象 */
  private socket?: WebSocket;
  /** 用户注入的 Api 配置 */
  private config?: OpenAPIConfig;
  /** 请求Id */
  private requestId: number;
  /** 是否调试环境 */
  public isDebug: boolean;
  /** 是否登录 */
  private isLogin: boolean;
  /** 心跳Timer */
  private aliveInterval: number;
  /** 接口回调Map */
  private callbackMap: Map<number, FPCallback | Function>;
  /** 错误回调 */
  private wsErrorHandler?: Function;
  /** 加密 */
  private mdSalt: string = 'ApP$!gNa+URe';

  constructor() {
    this.isDebug = false;
    this.isLogin = false;
    this.aliveInterval = 0;
    this.requestId = 0 | (Math.random() * 100000);
    this.callbackMap = new Map();
  }

  initConfig(config: OpenAPIConfig) {
    this.config = config;
  }

  initSocket() {
    return new Promise<WebSocket>((resolve, reject) => {
      try {
        const self = this;
        this.socket = new WebSocket(this.getWsUrl());
        this.socket.onmessage = this.onMessage.bind(this);
        this.socket.onopen = () => {
          self.setLang();
        };
        this.socket.onerror = (event) => {
          console.log(`FPMS init ws onerror: ${JSON.stringify(event)}`);
        };
        // @ts-ignore
        this.aliveInterval = setInterval(() => {
          self.isAlive((result: any) => {
            console.log('sent alive result:', result);
          });
        }, ALIVE_DELAY);
        resolve(this.socket);
      } catch (err: any) {
        console.log('init ws error: ', JSON.stringify(err));
        reject(err);
      }
    });
  }

  closeSocket() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      this.socket.close();
    }
    if (this.aliveInterval) {
      clearInterval(this.aliveInterval);
    }
    this.callbackMap.clear();
  }

  isPlayerLogin() {
    return this.isLogin;
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
      platformId: this.config!.PLATFORMID,
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
    callback?: FPCallback,
  ) {
    if (!this.checkConfig(callback)) {
      return;
    }
    const deviceType = this.config!.DEVICETYPE;
    const partnerId = deviceType === 3 ? PARTNER_ID_ANDROID : deviceType === 4 ? PARTNER_ID_IOS : PARTNER_ID_H5;
    const registerObj: { [key: string]: any } = {
      platformId: this.config!.PLATFORMID,
      partnerId: partnerId,
      phoneNumber: countryCode + phoneNo,
      smsCode: smsCode,
      deviceId: deviceId,
      deviceType: deviceType,
      longToken: true,
      domain: this.config!.WSCLIENTDOMAIN,
      captchaVerify: captchaVerify || '',
    };
    const self = this;
    const cmdString = this.buildCommandString(
      'player',
      'playerLoginOrRegisterWithSMS',
      registerObj,
      (result: any) => {
        if (result.status === 200) {
          self.isLogin = true;
          result.data.token = result.token;
        }
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
    callback?: FPCallback,
  ) {
    if (!this.checkConfig(callback)) {
      return;
    }
    const deviceType = this.config!.DEVICETYPE;
    const partnerId = deviceType === 3 ? PARTNER_ID_ANDROID : deviceType === 4 ? PARTNER_ID_IOS : PARTNER_ID_H5;
    const registerObj = {
      platformId: this.config!.PLATFORMID,
      partnerId: partnerId,
      phoneNumber: countryCode + phoneNo,
      captchaVerify: captchaVerify || '',
      password: userPwd,
      deviceId: deviceId,
      deviceType: deviceType,
      clientDomain: this.config!.WSCLIENTDOMAIN,
      longToken: true,
    };
    const self = this;
    const cmdString = this.buildCommandString(
      'player',
      'phoneNumberLoginWithPassword',
      registerObj,
      (result: any) => {
        if (result.status === 200) {
          self.isLogin = true;
          result.data.token = result.token;
        }
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
  public loginByToken(token: string, playerId: string, callback?: FPCallback) {
    if (!this.checkConfig(callback)) {
      return;
    }
    this.wsErrorHandler = callback;
    const tokenObj = {
      playerId,
      token,
      clientDomain: this.config!.WSCLIENTDOMAIN,
      isLogin: true,
    };
    const self = this;
    const cmdString = this.buildCommandString(
      'player',
      'authenticate',
      tokenObj,
      (result: any) => {
        if (result.status === 200) {
          self.isLogin = true;
          result.data.token = result.token;
        } else if (result.status === 493) {
          // token 过期
          result.errorMessage = 'The account login has expired, please log in again.';
        }
        if (callback) callback(result);
      },
      true,
    );
    this.send(cmdString, callback);
  }

  /** 获取登录 URL */
  public getLoginURL(callback?: Function) {
    if (!this.checkConfig(callback)) {
      return;
    }
    this.wsErrorHandler = callback;
    const requestObj = {
      gameId: this.config!.GAMEID,
      clientDomainName: this.config!.WSCLIENTDOMAIN,
      clientType: this.config!.WSCLIENTTYPE,
    };
    const cmdString = this.buildCommandString('game', 'getLoginURL', requestObj, callback);
    this.send(cmdString, callback);
  }

  /***
   * 获取 Google reCaptcha 验证是否开启, 如果开启，登录时需要填写 Google reCaptcha 验证
   * @param callback
   */
  public isGoogleCaptchaOpen(callback?: (open: boolean) => void) {
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

  private async getSocket(): Promise<WebSocket> {
    const self = this;
    const getSocket = new Promise<WebSocket>((resolve, reject) => {
      if (self.socket == undefined) {
        self.initSocket();
      } else {
        if (self.isSocketReady()) {
          resolve(self.socket);
          return;
        }
        if (self.socket.readyState === WebSocket.CONNECTING) {
          self.socket.onopen = () => {
            const cmdString = self.buildCommandString('connection', 'setLang', { lang: CertLang.English });
            self.socket?.send(cmdString);
            resolve(self.socket!);
          };
          self.socket.onerror = (error) => {
            console.log(`FPMS ws onerror: ${JSON.stringify(error)}`);
            this.wsErrorHandler?.(error);
            this.wsErrorHandler = undefined;
            reject(error);
          };
          return;
        }
        if (self.socket.readyState === WebSocket.CLOSING || self.socket.readyState === WebSocket.CLOSED) {
          self.isLogin = false;
          self.socket = new WebSocket(this.getWsUrl());
          self.socket.onmessage = self.onMessage.bind(self);
          self.socket.onopen = () => {
            self.setLang();
          };
          self.socket.onerror = (error) => {
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

  private getConfig(callback?: (result: any) => void) {
    const requestObj = {
      platformId: this.config!.PLATFORMID,
      device: 3,
    };
    const cmdString = this.buildCommandString('platform', 'getConfig', requestObj, callback);
    this.send(cmdString, callback);
  }

  private setLang(lang: CertLang = CertLang.English, callback?: Function) {
    const cmdString = this.buildCommandString('connection', 'setLang', { lang: lang }, callback);
    this.send(cmdString, callback);
  }

  private isAlive(callback?: Function) {
    const cmdString = this.buildCommandString('connection', 'isAlive', {}, callback);
    this.send(cmdString, callback);
  }

  private isSocketReady(): boolean {
    if (!this.socket) return false;
    return this.socket && this.socket.readyState === WebSocket.OPEN;
  }

  private getRequestId() {
    return this.requestId++;
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
    if (dataObj && this.config) {
      if (dataObj.deviceType === undefined) dataObj.deviceType = this.config.DEVICETYPE;
      const copyData = JSON.parse(JSON.stringify(dataObj));
      delete copyData.requestId;
      dataObj.signature = this.getAbc(copyData);
    }
    return dataObj;
  }

  private getWsUrl() {
    return this.isDebug ? 'wss://casinoplus-test-ph.bewen.me/websocket' : 'wss://cp-ws.casinoplus.live/websocket';
  }

  private checkConfig(complete?: Function): boolean {
    if (!this.config) {
      complete?.({
        status: 100000,
        errorMessage: 'SDK not initialized.',
      });
      return false;
    }
    return true;
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
      platformId: this.config!.PLATFORMID,
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
      const ws = await this.getSocket();
      ws.send(message);
    } catch (error: any) {
      if (retryCount < 2) {
        this.send(message, losePacketHandler, ++retryCount);
      } else {
        console.log('WebSocket connect error:', JSON.stringify(error));
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

  private onMessage(event: MessageEvent) {
    if (event) {
      console.log('onMessage: ', event.data);
      try {
        const stringData = event.data as string;
        const respObj = JSON.parse(stringData);
        const callback = this.callbackMap.get(respObj.requestId);
        callback?.(respObj.data);
      } catch (err: any) {
        console.log('parse json string error.' + JSON.stringify(err));
      }
    }
  }
}

globalThis.fpmsWs = FpmsWs;

function getFpmsService(config: OpenAPIConfig, targetService?: string) {
  if (targetService) {
    eval(targetService);
  }
  const service = new globalThis.fpmsWs(config);
  service.initConfig(config);
  return service;
}

export { getFpmsService, FpmsWs };
