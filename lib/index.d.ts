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
export declare enum IdentityType {
    ID = 1,
    License = 2,
    Passport = 3
}
/** 语言 */
export declare enum CertLang {
    Chinese = 1,
    English = 2,
    Vietnamese = 3,
    Thai = 4,
    Filipino = 5
}
/** 获取验证码用途 */
export declare enum SMSPurpose {
    PlayerLogin = "playerLogin",
    Register = "registration"
}
declare class FpmsConnector {
    private service;
    constructor();
    /**
     * 初始化配置
     * @param config
     */
    initConfig(config: OpenAPIConfig, sdkTarget?: string): Promise<void>;
    /**
     * 请求验证码
     * @param countryCode
     * @param phoneNum
     * @param purpose 请求验证码的用途: 登录 playerLogin, 注册 registration
     * @param callback
     */
    getSMSCode(countryCode: string, phoneNum: string, purpose?: string, callback?: Function): void;
    /**
     * 验证码注册或登录
     * @param deviceId 设备ID
     * @param countryCode
     * @param phoneNo
     * @param smsCode
     * @param captchaVerify Google 人机验证码
     * @param callback
     */
    loginOrRegisterBySMS(deviceId: string, countryCode: string, phoneNo: string, smsCode: string, captchaVerify?: string, callback?: FPCallback): void;
    /**
     * 密码登录
     * @param deviceId 设备ID
     * @param countryCode
     * @param phoneNo
     * @param userPwd
     * @param captchaVerify Google 人机验证码
     * @param callback
     */
    loginByPassword(deviceId: string, countryCode: string, phoneNo: string, userPwd: string, captchaVerify?: string, callback?: FPCallback): void;
    /**
     * token 登录
     * @param token
     * @param playerId
     * @param callback
     */
    loginByToken(token: string, playerId: string, callback?: FPCallback): void;
    /** 获取登录 URL */
    getLoginURL(callback?: Function): void;
    /***
     * 获取 Google reCaptcha 验证是否开启, 如果开启，登录时需要填写 Google reCaptcha 验证
     * @param callback
     */
    isGoogleCaptchaOpen(callback?: (open: boolean) => void): void;
    isPlayerLogin(): any;
    closeWsClient(): void;
}
export declare const fpms: FpmsConnector;
export {};
