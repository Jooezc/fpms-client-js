### 使用
1. 使用 npm 安装
```
npm i fpms-client-js
```
2. 导入 sdk
```
import { fpms } from 'fpms-client-js'
```
3. 设置 sdk 环境, 默认生产环境
```
fpms.isDebug = true;
```
4. 初始化
```
fpms.initConfig({
   PLATFORMID: "xx",
   PARTNERID: "xx",
   PROVIDERID: "xx",
   WSCLIENTDOMAIN: "xxxx",
   GAMEID: "xxxx",
   DEVICETYPE: xx,
   WSCLIENTTYPE: xx
});
```

5. 接口调用
```
/** 获取验证码 */
fpms.getSMSCode("countryCode", "phoneNum", "purpose");
/** 密码登录 */
fpms.loginByPassword("fffffffffeb5adeafeb5adea00000000", "countryCode", "phoneNum", "userPwd", "", (res) => {});
```
