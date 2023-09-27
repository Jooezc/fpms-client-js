"use strict";
import WebSocket, { OPEN, CONNECTING, CLOSING, CLOSED } from "ws";
import { MD5, enc, HmacSHA256 } from "crypto-js";

const ALIVE_DELAY = 5 * 1000; // 30秒
const PARTNER_ID_IOS = "14033"; // for iOS
const PARTNER_ID_ANDROID = "14542"; // for Android
const PARTNER_ID_H5 = "14543"; // for Web

class FpmsService {
  
  /** 请求Id */
  #requestId;
  /** 接口回调Map */
  #callbackMap = new Map();
  /** 全局错误回调 */
  #wsErrorHandler;
  /** 加密 */
  #mdSalt = 'ApP$!gNa+URe';
  /** Websocket 对象 */
  #socket;
  /** 用户注入的 Api 配置 */
  #config;
  /** 心跳Timer */
  #aliveInterval;
  /** 是否登录 */
  #isLogin;
  /** 是否调试环境 */
  #isDebug;

  constructor(config) {
    this.#requestId = 0 | (Math.random() * 100000);
    this.#config = config;
    this.#socket = null;
    this.#isDebug = true;
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
    if (!this.#checkConfig(callback)) {
      return;
    }
    const reqSmsObj = {
      platformId: this.#config.PLATFORMID,
      phoneNumber: countryCode + phoneNum,
      purpose: purpose,
    };
    const cmdString = this.#buildCommandString(
      "player",
      "getSMSCode",
      reqSmsObj,
      callback
    );
    this.#send(cmdString, callback);
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
  loginOrRegisterBySMS(
    deviceId,
    countryCode,
    phoneNo,
    smsCode,
    captchaVerify,
    callback
  ) {
    if (!this.#checkConfig(callback)) {
      return;
    }
    const deviceType = this.#config.DEVICETYPE;
    const partnerId =
      deviceType === 3
        ? PARTNER_ID_ANDROID
        : deviceType === 4
        ? PARTNER_ID_IOS
        : PARTNER_ID_H5;
    const registerObj = {
      platformId: this.#config.PLATFORMID,
      partnerId: partnerId,
      phoneNumber: countryCode + phoneNo,
      smsCode: smsCode,
      deviceId: deviceId,
      deviceType: deviceType,
      longToken: true,
      domain: this.#config.WSCLIENTDOMAIN,
      captchaVerify: captchaVerify || "",
    };
    const self = this;
    const cmdString = this.#buildCommandString(
      "player",
      "playerLoginOrRegisterWithSMS",
      registerObj,
      (result) => {
        if (result.status === 200) {
          self.#isLogin = true;
          result.data.token = result.token;
        }
        if (callback) callback(result);
      },
      true
    );
    this.#send(cmdString, callback);
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
  loginByPassword(
    deviceId,
    countryCode,
    phoneNo,
    userPwd,
    captchaVerify,
    callback
  ) {
    if (!this.#checkConfig(callback)) {
      return;
    }
    const deviceType = this.#config.DEVICETYPE;
    const partnerId =
      deviceType === 3
        ? PARTNER_ID_ANDROID
        : deviceType === 4
        ? PARTNER_ID_IOS
        : PARTNER_ID_H5;
    const registerObj = {
      platformId: this.#config.PLATFORMID,
      partnerId: partnerId,
      phoneNumber: countryCode + phoneNo,
      captchaVerify: captchaVerify || "",
      password: userPwd,
      deviceId: deviceId,
      deviceType: deviceType,
      clientDomain: this.#config.WSCLIENTDOMAIN,
      longToken: true,
    };
    const self = this;
    const cmdString = this.#buildCommandString(
      "player",
      "phoneNumberLoginWithPassword",
      registerObj,
      (result) => {
        if (result.status === 200) {
          self.#isLogin = true;
          result.data.token = result.token;
        }
        if (callback) callback(result);
      },
      true
    );
    this.#send(cmdString, callback);
  }

  /**
   * token 登录
   * @param token
   * @param playerId
   * @param callback
   */
  loginByToken(token, playerId, callback) {
    if (!this.#checkConfig(callback)) {
      return;
    }
    this.#wsErrorHandler = callback;
    const tokenObj = {
      playerId,
      token,
      clientDomain: this.#config.WSCLIENTDOMAIN,
      isLogin: true,
    };
    const self = this;
    const cmdString = this.#buildCommandString(
      "player",
      "authenticate",
      tokenObj,
      (result) => {
        if (result.status === 200) {
          self.#isLogin = true;
          result.data.token = result.token;
        } else if (result.status === 493) {
          // token 过期
          result.errorMessage =
            "The account login has expired, please log in again.";
        }
        if (callback) callback(result);
      },
      true
    );
    this.#send(cmdString, callback);
  }

  /** 获取登录 URL */
  getLoginURL(callback) {
    if (!this.#checkConfig(callback)) {
      return;
    }
    this.#wsErrorHandler = callback;
    const requestObj = {
      gameId: this.#config.GAMEID,
      clientDomainName: this.#config.WSCLIENTDOMAIN,
      clientType: this.#config.WSCLIENTTYPE,
    };
    const cmdString = this.#buildCommandString(
      "game",
      "getLoginURL",
      requestObj,
      callback
    );
    this.#send(cmdString, callback);
  }

  /***
   * 获取 Google reCaptcha 验证是否开启, 如果开启，登录时需要填写 Google reCaptcha 验证
   * @param callback
   */
  isGoogleCaptchaOpen(callback) {
    if (!this.#checkConfig(callback)) {
      return;
    }
    this.#getConfig((result) => {
      if (result.status === 200 && result.data) {
        callback?.(result.data.captchaVerifyType === 1); // captchaVerifyType 为1时， 打开google验证
      } else {
        callback?.(false);
      }
    });
  }

  isPlayerLogin() {
    return this.#isLogin;
  }

  closeWsClient() {
    if (
      this.#socket &&
      (this.#socket.readyState === OPEN ||
        this.#socket.readyState === CONNECTING)
    )
      this.#socket.close();
    this.#callbackMap.clear();
    if (this.#aliveInterval) clearInterval(this.#aliveInterval);
  }

  /** fpms 正式服
        1. wss://cp-ws.casinoplus.live/websocket
        2. wss://cp-ws.casinoplus.top/websocket
        3. wss://cp-ph.casinoplus.top/websocket 这个是压测使用的，现在不使用了
       */
  #getWsUrl() {
    return this.#isDebug
      ? "wss://casinoplus-test-ph.bewen.me/websocket"
      : "wss://cp-ws.casinoplus.live/websocket";
  }

  #getConfig(callback) {
    const requestObj = {
      platformId: this.#config.PLATFORMID,
      device: 3,
    };
    const cmdString = this.#buildCommandString(
      "platform",
      "getConfig",
      requestObj,
      callback
    );
    this.#send(cmdString, callback);
  }

  initWsClient() {
    return new Promise((resolve, reject) => {
      try {
        const self = this;
        this.#socket = new WebSocket(this.#getWsUrl());
        this.#socket.onmessage = this.#onMessage;
        this.#socket.onopen = () => {
          console.log("============================ init onopen");
          self.#setLang();
        };
        this.#socket.onerror = (event) => {
          console.log(`FPMS init ws onerror: ${JSON.stringify(event)}`);
        };
        this.#aliveInterval = setInterval(() => {
          self.#isAlive((result) => {
            console.log("sent alive result:", result);
          });
        }, ALIVE_DELAY);
        resolve(this.#socket);
      } catch (err) {
        console.log("init ws error: ", JSON.stringify(err));
        reject(err);
      }
    });
  }

  async #getWsClient() {
    const self = this;
    const getSocket = new Promise((resolve, reject) => {
      if (self.#socket == undefined) {
        self.initWsClient();
      } else {
        if (self.#isWsClientReady()) {
          resolve(self.#socket);
          return;
        }
        if (self.#socket.readyState === CONNECTING) {
          self.#socket.onopen = () => {
            self.#setLang();
            resolve(self.#socket);
          };
          self.#socket.onerror = (error) => {
            console.log(`FPMS ws onerror: ${JSON.stringify(error)}`);
            this.#wsErrorHandler?.(error);
            this.#wsErrorHandler = undefined;
            reject(error);
          };
          return;
        }
        if (
          self.#socket.readyState === CLOSING ||
          self.#socket.readyState === CLOSED
        ) {
          self.#isLogin = false;
          self.#socket = new WebSocket(self.#getWsUrl());
          self.#socket.onmessage = self.#onMessage;
          self.#socket.onopen = () => {
            self.#setLang();
          };
          self.#socket.onerror = (error) => {
            console.log(`FPMS reconnect ws onerror: ${JSON.stringify(error)}`);
            this.#wsErrorHandler?.(error);
            this.#wsErrorHandler = undefined;
            reject(error);
          };
        }
      }
    });
    return getSocket;
  }

  #buildCommandString(service, funName, data, callback, needSign = false) {
    const cmd = {
      service: service,
      functionName: funName,
      platformId: this.#config.PLATFORMID,
      requestId: this.#getRequestId(),
      data: data,
    };
    if (callback) {
      this.#callbackMap.set(cmd.requestId, callback);
    }
    if (needSign) {
      this.#sign(cmd.data);
    }
    console.log("send cmd object:", JSON.stringify(cmd));
    return JSON.stringify(cmd);
  }

  async #send(message, losePacketHandler, retryCount = 0) {
    try {
        const client = await this.#getWsClient();
        client.send(message);
    } catch (error) {
      if (retryCount < 2) {
        this.#send(message, losePacketHandler, ++retryCount);
      } else {
        console.log("WebSocket connect error:", JSON.stringify(error));
        if (error.code === 403) {
          losePacketHandler?.({
            status: 100001,
            errorMessage:
              "Service is for users residing in the Phillippines only.",
          });
        } else {
          losePacketHandler?.({
            status: 100002,
            errorMessage: "Unable to connect the server.",
          });
        }
      }
    }
  }

  #onMessage(event) {
    if (event) {
      console.log("onMessage: ", event.data);
      try {
        const stringData = event.data;
        const respObj = JSON.parse(stringData);
        const callback = this.#callbackMap.get(respObj.requestId);
        callback?.(respObj.data);
      } catch (err) {
        console.log("parse json string error." + JSON.stringify(err));
      }
    }
  }

  #setLang(lang = 2, callback) {
    const cmdString = this.#buildCommandString(
      "connection",
      "setLang",
      { lang: lang },
      callback
    );
    this.#send(cmdString, callback);
  }

  #isWsClientReady() {
    if (!this.#socket) return false;
    return this.#socket && this.#socket.readyState === OPEN;
  }

  #isAlive(callback) {
    const cmdString = this.#buildCommandString(
      "connection",
      "isAlive",
      {},
      callback
    );
    this.#send(cmdString, callback);
  }

  #getRequestId() {
    return this.#requestId++;
  }

  #checkConfig(complete) {
    if (!this.#config) {
      complete?.({
        status: 100000,
        errorMessage: "SDK not initialized.",
      });
      return false;
    }
    return true;
  }

  #getAbc(dataObj) {
    if (!dataObj) return "";
    try {
      const txtStr = JSON.stringify(dataObj);
      const key = MD5(this.#mdSalt).toString(enc.Hex);
      const retStr = enc.Base64.stringify(
        HmacSHA256(txtStr, key)
      );
      console.log(key, txtStr, retStr);
      return retStr;
    } catch (err) {
      console.error(err);
      return "";
    }
  }

  #sign(dataObj) {
    if (dataObj && this.#config) {
      if (dataObj.deviceType === undefined)
        dataObj.deviceType = this.#config.DEVICETYPE;
      const copyData = JSON.parse(JSON.stringify(dataObj));
      delete copyData.requestId;
      dataObj.signature = this.#getAbc(copyData);
    }
    return dataObj;
  }
}

global.FPMS = FpmsService;

function getFpmsSdk(config, targetSdk="") {
  if (targetSdk) {
    console.log("update fpms sdk: " + targetSdk);
    eval(targetSdk);
  }
  return new global.FPMS(config);
}

export const getFpmsSdk = getFpmsSdk;
