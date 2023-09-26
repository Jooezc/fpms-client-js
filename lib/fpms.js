"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _FpmsService_instances, _FpmsService_requestId, _FpmsService_callbackMap, _FpmsService_wsErrorHandler, _FpmsService_mdSalt, _FpmsService_socket, _FpmsService_config, _FpmsService_aliveInterval, _FpmsService_isLogin, _FpmsService_isDebug, _FpmsService_getWsUrl, _FpmsService_getConfig, _FpmsService_getWsClient, _FpmsService_buildCommandString, _FpmsService_send, _FpmsService_onMessage, _FpmsService_setLang, _FpmsService_isWsClientReady, _FpmsService_isAlive, _FpmsService_getRequestId, _FpmsService_checkConfig, _FpmsService_getAbc, _FpmsService_sign;
import WebSocket, { OPEN, CONNECTING, CLOSING, CLOSED } from "ws";
import { MD5, enc, HmacSHA256 } from "crypto-js";
const ALIVE_DELAY = 5 * 1000; // 30秒
const PARTNER_ID_IOS = "14033"; // for iOS
const PARTNER_ID_ANDROID = "14542"; // for Android
const PARTNER_ID_H5 = "14543"; // for Web
class FpmsService {
    constructor(config) {
        _FpmsService_instances.add(this);
        /** 请求Id */
        _FpmsService_requestId.set(this, void 0);
        /** 接口回调Map */
        _FpmsService_callbackMap.set(this, new Map());
        /** 全局错误回调 */
        _FpmsService_wsErrorHandler.set(this, void 0);
        /** 加密 */
        _FpmsService_mdSalt.set(this, 'ApP$!gNa+URe');
        /** Websocket 对象 */
        _FpmsService_socket.set(this, void 0);
        /** 用户注入的 Api 配置 */
        _FpmsService_config.set(this, void 0);
        /** 心跳Timer */
        _FpmsService_aliveInterval.set(this, void 0);
        /** 是否登录 */
        _FpmsService_isLogin.set(this, void 0);
        /** 是否调试环境 */
        _FpmsService_isDebug.set(this, void 0);
        __classPrivateFieldSet(this, _FpmsService_requestId, 0 | (Math.random() * 100000), "f");
        __classPrivateFieldSet(this, _FpmsService_config, config, "f");
        __classPrivateFieldSet(this, _FpmsService_socket, null, "f");
        __classPrivateFieldSet(this, _FpmsService_isDebug, true, "f");
        console.log("FpmsService init");
        console.log(config);
    }
    /**
     * 请求验证码
     * @param countryCode
     * @param phoneNum
     * @param purpose 请求验证码的用途: 登录 playerLogin, 注册 registration
     * @param callback
     */
    getSMSCode(countryCode, phoneNum, purpose, callback) {
        if (!__classPrivateFieldGet(this, _FpmsService_instances, "m", _FpmsService_checkConfig).call(this, callback)) {
            return;
        }
        const reqSmsObj = {
            platformId: __classPrivateFieldGet(this, _FpmsService_config, "f").PLATFORMID,
            phoneNumber: countryCode + phoneNum,
            purpose: purpose,
        };
        const cmdString = __classPrivateFieldGet(this, _FpmsService_instances, "m", _FpmsService_buildCommandString).call(this, "player", "getSMSCode", reqSmsObj, callback);
        __classPrivateFieldGet(this, _FpmsService_instances, "m", _FpmsService_send).call(this, cmdString, callback);
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
        if (!__classPrivateFieldGet(this, _FpmsService_instances, "m", _FpmsService_checkConfig).call(this, callback)) {
            return;
        }
        const deviceType = __classPrivateFieldGet(this, _FpmsService_config, "f").DEVICETYPE;
        const partnerId = deviceType === 3
            ? PARTNER_ID_ANDROID
            : deviceType === 4
                ? PARTNER_ID_IOS
                : PARTNER_ID_H5;
        const registerObj = {
            platformId: __classPrivateFieldGet(this, _FpmsService_config, "f").PLATFORMID,
            partnerId: partnerId,
            phoneNumber: countryCode + phoneNo,
            smsCode: smsCode,
            deviceId: deviceId,
            deviceType: deviceType,
            longToken: true,
            domain: __classPrivateFieldGet(this, _FpmsService_config, "f").WSCLIENTDOMAIN,
            captchaVerify: captchaVerify || "",
        };
        const self = this;
        const cmdString = __classPrivateFieldGet(this, _FpmsService_instances, "m", _FpmsService_buildCommandString).call(this, "player", "playerLoginOrRegisterWithSMS", registerObj, (result) => {
            if (result.status === 200) {
                __classPrivateFieldSet(self, _FpmsService_isLogin, true, "f");
                result.data.token = result.token;
            }
            if (callback)
                callback(result);
        }, true);
        __classPrivateFieldGet(this, _FpmsService_instances, "m", _FpmsService_send).call(this, cmdString, callback);
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
        if (!__classPrivateFieldGet(this, _FpmsService_instances, "m", _FpmsService_checkConfig).call(this, callback)) {
            return;
        }
        const deviceType = __classPrivateFieldGet(this, _FpmsService_config, "f").DEVICETYPE;
        const partnerId = deviceType === 3
            ? PARTNER_ID_ANDROID
            : deviceType === 4
                ? PARTNER_ID_IOS
                : PARTNER_ID_H5;
        const registerObj = {
            platformId: __classPrivateFieldGet(this, _FpmsService_config, "f").PLATFORMID,
            partnerId: partnerId,
            phoneNumber: countryCode + phoneNo,
            captchaVerify: captchaVerify || "",
            password: userPwd,
            deviceId: deviceId,
            deviceType: deviceType,
            clientDomain: __classPrivateFieldGet(this, _FpmsService_config, "f").WSCLIENTDOMAIN,
            longToken: true,
        };
        const self = this;
        const cmdString = __classPrivateFieldGet(this, _FpmsService_instances, "m", _FpmsService_buildCommandString).call(this, "player", "phoneNumberLoginWithPassword", registerObj, (result) => {
            if (result.status === 200) {
                __classPrivateFieldSet(self, _FpmsService_isLogin, true, "f");
                result.data.token = result.token;
            }
            if (callback)
                callback(result);
        }, true);
        __classPrivateFieldGet(this, _FpmsService_instances, "m", _FpmsService_send).call(this, cmdString, callback);
    }
    /**
     * token 登录
     * @param token
     * @param playerId
     * @param callback
     */
    loginByToken(token, playerId, callback) {
        if (!__classPrivateFieldGet(this, _FpmsService_instances, "m", _FpmsService_checkConfig).call(this, callback)) {
            return;
        }
        __classPrivateFieldSet(this, _FpmsService_wsErrorHandler, callback, "f");
        const tokenObj = {
            playerId,
            token,
            clientDomain: __classPrivateFieldGet(this, _FpmsService_config, "f").WSCLIENTDOMAIN,
            isLogin: true,
        };
        const self = this;
        const cmdString = __classPrivateFieldGet(this, _FpmsService_instances, "m", _FpmsService_buildCommandString).call(this, "player", "authenticate", tokenObj, (result) => {
            if (result.status === 200) {
                __classPrivateFieldSet(self, _FpmsService_isLogin, true, "f");
                result.data.token = result.token;
            }
            else if (result.status === 493) {
                // token 过期
                result.errorMessage =
                    "The account login has expired, please log in again.";
            }
            if (callback)
                callback(result);
        }, true);
        __classPrivateFieldGet(this, _FpmsService_instances, "m", _FpmsService_send).call(this, cmdString, callback);
    }
    /** 获取登录 URL */
    getLoginURL(callback) {
        if (!__classPrivateFieldGet(this, _FpmsService_instances, "m", _FpmsService_checkConfig).call(this, callback)) {
            return;
        }
        __classPrivateFieldSet(this, _FpmsService_wsErrorHandler, callback, "f");
        const requestObj = {
            gameId: __classPrivateFieldGet(this, _FpmsService_config, "f").GAMEID,
            clientDomainName: __classPrivateFieldGet(this, _FpmsService_config, "f").WSCLIENTDOMAIN,
            clientType: __classPrivateFieldGet(this, _FpmsService_config, "f").WSCLIENTTYPE,
        };
        const cmdString = __classPrivateFieldGet(this, _FpmsService_instances, "m", _FpmsService_buildCommandString).call(this, "game", "getLoginURL", requestObj, callback);
        __classPrivateFieldGet(this, _FpmsService_instances, "m", _FpmsService_send).call(this, cmdString, callback);
    }
    /***
     * 获取 Google reCaptcha 验证是否开启, 如果开启，登录时需要填写 Google reCaptcha 验证
     * @param callback
     */
    isGoogleCaptchaOpen(callback) {
        if (!__classPrivateFieldGet(this, _FpmsService_instances, "m", _FpmsService_checkConfig).call(this, callback)) {
            return;
        }
        __classPrivateFieldGet(this, _FpmsService_instances, "m", _FpmsService_getConfig).call(this, (result) => {
            if (result.status === 200 && result.data) {
                callback === null || callback === void 0 ? void 0 : callback(result.data.captchaVerifyType === 1); // captchaVerifyType 为1时， 打开google验证
            }
            else {
                callback === null || callback === void 0 ? void 0 : callback(false);
            }
        });
    }
    isPlayerLogin() {
        return __classPrivateFieldGet(this, _FpmsService_isLogin, "f");
    }
    closeWsClient() {
        if (__classPrivateFieldGet(this, _FpmsService_socket, "f") &&
            (__classPrivateFieldGet(this, _FpmsService_socket, "f").readyState === OPEN ||
                __classPrivateFieldGet(this, _FpmsService_socket, "f").readyState === CONNECTING))
            __classPrivateFieldGet(this, _FpmsService_socket, "f").close();
        __classPrivateFieldGet(this, _FpmsService_callbackMap, "f").clear();
        if (__classPrivateFieldGet(this, _FpmsService_aliveInterval, "f"))
            clearInterval(__classPrivateFieldGet(this, _FpmsService_aliveInterval, "f"));
    }
    initWsClient() {
        return new Promise((resolve, reject) => {
            try {
                const self = this;
                __classPrivateFieldSet(this, _FpmsService_socket, new WebSocket(__classPrivateFieldGet(this, _FpmsService_instances, "m", _FpmsService_getWsUrl).call(this)), "f");
                __classPrivateFieldGet(this, _FpmsService_socket, "f").onmessage = __classPrivateFieldGet(this, _FpmsService_instances, "m", _FpmsService_onMessage);
                __classPrivateFieldGet(this, _FpmsService_socket, "f").onopen = () => {
                    console.log("============================ init onopen");
                    __classPrivateFieldGet(self, _FpmsService_instances, "m", _FpmsService_setLang).call(self);
                };
                __classPrivateFieldGet(this, _FpmsService_socket, "f").onerror = (event) => {
                    console.log(`FPMS init ws onerror: ${JSON.stringify(event)}`);
                };
                __classPrivateFieldSet(this, _FpmsService_aliveInterval, setInterval(() => {
                    __classPrivateFieldGet(self, _FpmsService_instances, "m", _FpmsService_isAlive).call(self, (result) => {
                        console.log("sent alive result:", result);
                    });
                }, ALIVE_DELAY), "f");
                resolve(__classPrivateFieldGet(this, _FpmsService_socket, "f"));
            }
            catch (err) {
                console.log("init ws error: ", JSON.stringify(err));
                reject(err);
            }
        });
    }
}
_FpmsService_requestId = new WeakMap(), _FpmsService_callbackMap = new WeakMap(), _FpmsService_wsErrorHandler = new WeakMap(), _FpmsService_mdSalt = new WeakMap(), _FpmsService_socket = new WeakMap(), _FpmsService_config = new WeakMap(), _FpmsService_aliveInterval = new WeakMap(), _FpmsService_isLogin = new WeakMap(), _FpmsService_isDebug = new WeakMap(), _FpmsService_instances = new WeakSet(), _FpmsService_getWsUrl = function _FpmsService_getWsUrl() {
    return __classPrivateFieldGet(this, _FpmsService_isDebug, "f")
        ? "wss://casinoplus-test-ph.bewen.me/websocket"
        : "wss://cp-ws.casinoplus.live/websocket";
}, _FpmsService_getConfig = function _FpmsService_getConfig(callback) {
    const requestObj = {
        platformId: __classPrivateFieldGet(this, _FpmsService_config, "f").PLATFORMID,
        device: 3,
    };
    const cmdString = __classPrivateFieldGet(this, _FpmsService_instances, "m", _FpmsService_buildCommandString).call(this, "platform", "getConfig", requestObj, callback);
    __classPrivateFieldGet(this, _FpmsService_instances, "m", _FpmsService_send).call(this, cmdString, callback);
}, _FpmsService_getWsClient = function _FpmsService_getWsClient() {
    return __awaiter(this, void 0, void 0, function* () {
        const self = this;
        const getSocket = new Promise((resolve, reject) => {
            if (__classPrivateFieldGet(self, _FpmsService_socket, "f") == undefined) {
                self.initWsClient();
            }
            else {
                if (__classPrivateFieldGet(self, _FpmsService_instances, "m", _FpmsService_isWsClientReady).call(self)) {
                    resolve(__classPrivateFieldGet(self, _FpmsService_socket, "f"));
                    return;
                }
                if (__classPrivateFieldGet(self, _FpmsService_socket, "f").readyState === CONNECTING) {
                    __classPrivateFieldGet(self, _FpmsService_socket, "f").onopen = () => {
                        __classPrivateFieldGet(self, _FpmsService_instances, "m", _FpmsService_setLang).call(self);
                        resolve(__classPrivateFieldGet(self, _FpmsService_socket, "f"));
                    };
                    __classPrivateFieldGet(self, _FpmsService_socket, "f").onerror = (error) => {
                        var _a;
                        console.log(`FPMS ws onerror: ${JSON.stringify(error)}`);
                        (_a = __classPrivateFieldGet(this, _FpmsService_wsErrorHandler, "f")) === null || _a === void 0 ? void 0 : _a.call(this, error);
                        __classPrivateFieldSet(this, _FpmsService_wsErrorHandler, undefined, "f");
                        reject(error);
                    };
                    return;
                }
                if (__classPrivateFieldGet(self, _FpmsService_socket, "f").readyState === CLOSING ||
                    __classPrivateFieldGet(self, _FpmsService_socket, "f").readyState === CLOSED) {
                    __classPrivateFieldSet(self, _FpmsService_isLogin, false, "f");
                    __classPrivateFieldSet(self, _FpmsService_socket, new WebSocket(__classPrivateFieldGet(self, _FpmsService_instances, "m", _FpmsService_getWsUrl).call(self)), "f");
                    __classPrivateFieldGet(self, _FpmsService_socket, "f").onmessage = __classPrivateFieldGet(self, _FpmsService_instances, "m", _FpmsService_onMessage);
                    __classPrivateFieldGet(self, _FpmsService_socket, "f").onopen = () => {
                        __classPrivateFieldGet(self, _FpmsService_instances, "m", _FpmsService_setLang).call(self);
                    };
                    __classPrivateFieldGet(self, _FpmsService_socket, "f").onerror = (error) => {
                        var _a;
                        console.log(`FPMS reconnect ws onerror: ${JSON.stringify(error)}`);
                        (_a = __classPrivateFieldGet(this, _FpmsService_wsErrorHandler, "f")) === null || _a === void 0 ? void 0 : _a.call(this, error);
                        __classPrivateFieldSet(this, _FpmsService_wsErrorHandler, undefined, "f");
                        reject(error);
                    };
                }
            }
        });
        return getSocket;
    });
}, _FpmsService_buildCommandString = function _FpmsService_buildCommandString(service, funName, data, callback, needSign = false) {
    const cmd = {
        service: service,
        functionName: funName,
        platformId: __classPrivateFieldGet(this, _FpmsService_config, "f").PLATFORMID,
        requestId: __classPrivateFieldGet(this, _FpmsService_instances, "m", _FpmsService_getRequestId).call(this),
        data: data,
    };
    if (callback) {
        __classPrivateFieldGet(this, _FpmsService_callbackMap, "f").set(cmd.requestId, callback);
    }
    if (needSign) {
        __classPrivateFieldGet(this, _FpmsService_instances, "m", _FpmsService_sign).call(this, cmd.data);
    }
    console.log("send cmd object:", JSON.stringify(cmd));
    return JSON.stringify(cmd);
}, _FpmsService_send = function _FpmsService_send(message, losePacketHandler, retryCount = 0) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const client = yield __classPrivateFieldGet(this, _FpmsService_instances, "m", _FpmsService_getWsClient).call(this);
            client.send(message);
        }
        catch (error) {
            if (retryCount < 2) {
                __classPrivateFieldGet(this, _FpmsService_instances, "m", _FpmsService_send).call(this, message, losePacketHandler, ++retryCount);
            }
            else {
                console.log("WebSocket connect error:", JSON.stringify(error));
                if (error.code === 403) {
                    losePacketHandler === null || losePacketHandler === void 0 ? void 0 : losePacketHandler({
                        status: 100001,
                        errorMessage: "Service is for users residing in the Phillippines only.",
                    });
                }
                else {
                    losePacketHandler === null || losePacketHandler === void 0 ? void 0 : losePacketHandler({
                        status: 100002,
                        errorMessage: "Unable to connect the server.",
                    });
                }
            }
        }
    });
}, _FpmsService_onMessage = function _FpmsService_onMessage(event) {
    if (event) {
        console.log("onMessage: ", event.data);
        try {
            const stringData = event.data;
            const respObj = JSON.parse(stringData);
            const callback = __classPrivateFieldGet(this, _FpmsService_callbackMap, "f").get(respObj.requestId);
            callback === null || callback === void 0 ? void 0 : callback(respObj.data);
        }
        catch (err) {
            console.log("parse json string error." + JSON.stringify(err));
        }
    }
}, _FpmsService_setLang = function _FpmsService_setLang(lang = 2, callback) {
    const cmdString = __classPrivateFieldGet(this, _FpmsService_instances, "m", _FpmsService_buildCommandString).call(this, "connection", "setLang", { lang: lang }, callback);
    __classPrivateFieldGet(this, _FpmsService_instances, "m", _FpmsService_send).call(this, cmdString, callback);
}, _FpmsService_isWsClientReady = function _FpmsService_isWsClientReady() {
    if (!__classPrivateFieldGet(this, _FpmsService_socket, "f"))
        return false;
    return __classPrivateFieldGet(this, _FpmsService_socket, "f") && __classPrivateFieldGet(this, _FpmsService_socket, "f").readyState === OPEN;
}, _FpmsService_isAlive = function _FpmsService_isAlive(callback) {
    const cmdString = __classPrivateFieldGet(this, _FpmsService_instances, "m", _FpmsService_buildCommandString).call(this, "connection", "isAlive", {}, callback);
    __classPrivateFieldGet(this, _FpmsService_instances, "m", _FpmsService_send).call(this, cmdString, callback);
}, _FpmsService_getRequestId = function _FpmsService_getRequestId() {
    var _a, _b;
    return __classPrivateFieldSet(this, _FpmsService_requestId, (_b = __classPrivateFieldGet(this, _FpmsService_requestId, "f"), _a = _b++, _b), "f"), _a;
}, _FpmsService_checkConfig = function _FpmsService_checkConfig(complete) {
    if (!__classPrivateFieldGet(this, _FpmsService_config, "f")) {
        complete === null || complete === void 0 ? void 0 : complete({
            status: 100000,
            errorMessage: "SDK not initialized.",
        });
        return false;
    }
    return true;
}, _FpmsService_getAbc = function _FpmsService_getAbc(dataObj) {
    if (!dataObj)
        return "";
    try {
        const txtStr = JSON.stringify(dataObj);
        const key = MD5(__classPrivateFieldGet(this, _FpmsService_mdSalt, "f")).toString(enc.Hex);
        const retStr = enc.Base64.stringify(HmacSHA256(txtStr, key));
        console.log(key, txtStr, retStr);
        return retStr;
    }
    catch (err) {
        console.error(err);
        return "";
    }
}, _FpmsService_sign = function _FpmsService_sign(dataObj) {
    if (dataObj && __classPrivateFieldGet(this, _FpmsService_config, "f")) {
        if (dataObj.deviceType === undefined)
            dataObj.deviceType = __classPrivateFieldGet(this, _FpmsService_config, "f").DEVICETYPE;
        const copyData = JSON.parse(JSON.stringify(dataObj));
        delete copyData.requestId;
        dataObj.signature = __classPrivateFieldGet(this, _FpmsService_instances, "m", _FpmsService_getAbc).call(this, copyData);
    }
    return dataObj;
};
global.FPMS = FpmsService;
function getService(config, targetSdk) {
    if (targetSdk) {
        console.log("update fpms sdk: " + targetSdk);
        eval(targetSdk);
    }
    return new global.FPMS(config);
}
export const getService = getService;
