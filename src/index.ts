import { FpmsWs, getFpmsService, ICertPlayer, OpenAPIConfig, SMSPurpose } from "./fpms_ws";

export type FPCallback = (res: FPResponse) => void;

/** Api Res */
export interface FPResponse {
    status: number;
    data?: ICertPlayer;
    errorMessage?: string;
}

class FpmsConnector {

    private service: FpmsWs;

    constructor() {
    }

    /**
     * 初始化配置
     * @param config
     */
    public async initConfig(config: OpenAPIConfig, sdkTarget?: string) {
        this.service = getFpmsService(config, sdkTarget);
        await this.service.initSocket();
        console.log("============================ init initConfig complete =============================");
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
        if (!this.checkService()) {
            return;
        }
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
        if (!this.checkService()) {
            return;
        }
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
        if (!this.checkService()) {
            return;
        }
        this.service.loginByPassword(deviceId, countryCode, phoneNo, userPwd, captchaVerify, callback);
    }

    /**
     * token 登录
     * @param token
     * @param playerId
     * @param callback
     */
    public loginByToken(token: string, playerId: string, callback?: FPCallback) {
        if (!this.checkService()) {
            return;
        }
        this.service.loginByToken(token, playerId, callback);
    }

    /** 获取登录 URL */
    public getLoginURL(callback?: Function) {
        if (!this.checkService()) {
            return;
        }
        this.service.getLoginURL(callback);
    }

    /***
     * 获取 Google reCaptcha 验证是否开启, 如果开启，登录时需要填写 Google reCaptcha 验证
     * @param callback
     */
    public isGoogleCaptchaOpen(callback?: (open: boolean) => void) {
        if (!this.checkService()) {
            return;
        }
        this.service.isGoogleCaptchaOpen(callback);
    }

    public isPlayerLogin() {
        if (!this.checkService()) {
            return;
        }
        return this.service.isPlayerLogin();
    }

    public closeSocket() {
        if (!this.checkService()) {
            return;
        }
        this.service.closeSocket();
    }

    private checkService(complete?: Function): boolean {
        if (!this.service) {
            complete?.({
                status: 100001,
                errorMessage: 'SDK not initialized, please initConfig first.',
            });
            return false;
        }
        return true;
    }
}

export const fpms = new FpmsConnector();