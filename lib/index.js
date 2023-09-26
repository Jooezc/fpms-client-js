var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as FPMS from './fpms.js';
/** ID类型 */
export var IdentityType;
(function (IdentityType) {
    IdentityType[IdentityType["ID"] = 1] = "ID";
    IdentityType[IdentityType["License"] = 2] = "License";
    IdentityType[IdentityType["Passport"] = 3] = "Passport";
})(IdentityType || (IdentityType = {}));
/** 语言 */
export var CertLang;
(function (CertLang) {
    CertLang[CertLang["Chinese"] = 1] = "Chinese";
    CertLang[CertLang["English"] = 2] = "English";
    CertLang[CertLang["Vietnamese"] = 3] = "Vietnamese";
    CertLang[CertLang["Thai"] = 4] = "Thai";
    CertLang[CertLang["Filipino"] = 5] = "Filipino";
})(CertLang || (CertLang = {}));
/** 获取验证码用途 */
export var SMSPurpose;
(function (SMSPurpose) {
    SMSPurpose["PlayerLogin"] = "playerLogin";
    SMSPurpose["Register"] = "registration";
})(SMSPurpose || (SMSPurpose = {}));
class FpmsConnector {
    constructor() { }
    /**
     * 初始化配置
     * @param config
     */
    initConfig(config, sdkTarget) {
        return __awaiter(this, void 0, void 0, function* () {
            this.service = FPMS.getService(config, sdkTarget);
            yield this.service.initWsClient();
            console.log('============================ init initConfig complete =============================');
        });
    }
    /**
     * 请求验证码
     * @param countryCode
     * @param phoneNum
     * @param purpose 请求验证码的用途: 登录 playerLogin, 注册 registration
     * @param callback
     */
    getSMSCode(countryCode, phoneNum, purpose = SMSPurpose.PlayerLogin, callback) {
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
    loginOrRegisterBySMS(deviceId, countryCode, phoneNo, smsCode, captchaVerify, callback) {
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
    loginByPassword(deviceId, countryCode, phoneNo, userPwd, captchaVerify, callback) {
        this.service.loginByPassword(deviceId, countryCode, phoneNo, userPwd, captchaVerify, callback);
    }
    /**
     * token 登录
     * @param token
     * @param playerId
     * @param callback
     */
    loginByToken(token, playerId, callback) {
        this.service.loginByToken(token, playerId, callback);
    }
    /** 获取登录 URL */
    getLoginURL(callback) {
        this.service.getLoginURL(callback);
    }
    /***
     * 获取 Google reCaptcha 验证是否开启, 如果开启，登录时需要填写 Google reCaptcha 验证
     * @param callback
     */
    isGoogleCaptchaOpen(callback) {
        this.service.isGoogleCaptchaOpen(callback);
    }
    isPlayerLogin() {
        return this.service.isPlayerLogin();
    }
    closeWsClient() {
        this.service.closeWsClient();
    }
}
export const fpms = new FpmsConnector();
