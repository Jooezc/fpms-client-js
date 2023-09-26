import * as FPMS from './fpms.js';

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

/** Api Res */
export interface FPResponse {
  status: number;
  data?: ICertPlayer;
  errorMessage?: string;
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

/** ID类型 */
export enum IdentityType {
  ID = 1,
  License,
  Passport,
}

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

class FpmsConnector {
  private service: any;

  constructor() {}

  /**
   * 初始化配置
   * @param config
   */
  public async initConfig(config: OpenAPIConfig, sdkTarget?: string) {
    this.service = FPMS.getService(config, sdkTarget);
    await this.service.initWsClient();
    console.log('============================ init initConfig complete =============================');
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
    this.service.getSMSCode(countryCode, phoneNum, purpose, callback);
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
    this.service.loginOrRegisterBySMS(deviceId, countryCode, phoneNo, smsCode, captchaVerify, callback);
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
    this.service.loginByPassword(deviceId, countryCode, phoneNo, userPwd, captchaVerify, callback);
  }

  /**
   * token 登录
   * @param token
   * @param playerId
   * @param callback
   */
  public loginByToken(token: string, playerId: string, callback?: FPCallback) {
    this.service.loginByToken(token, playerId, callback);
  }

  /** 获取登录 URL */
  public getLoginURL(callback?: Function) {
    this.service.getLoginURL(callback);
  }

  /***
   * 获取 Google reCaptcha 验证是否开启, 如果开启，登录时需要填写 Google reCaptcha 验证
   * @param callback
   */
  public isGoogleCaptchaOpen(callback?: (open: boolean) => void) {
    this.service.isGoogleCaptchaOpen(callback);
  }

  public isPlayerLogin() {
    return this.service.isPlayerLogin();
  }

  public closeWsClient() {
    this.service.closeWsClient();
  }
}

export const fpms = new FpmsConnector();
