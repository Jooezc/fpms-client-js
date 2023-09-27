import { getFpmsSdk } from '../fpms';
test('fpms test', async () => {
  const config = {
    PLATFORMID: '50',
    PARTNERID: '14033',
    PROVIDERID: '165',
    WSCLIENTDOMAIN: 'tongitskingdom.com',
    GAMEID: '5CB92264-2205-4869-860C-52F5F0799F99',
    DEVICETYPE: 3,
    WSCLIENTTYPE: 4,
  };
  console.log(`fpms=`, getFpmsSdk(config));
  // await fpms.initConfig({
  //   PLATFORMID: "50",
  //   PARTNERID: "14033",
  //   PROVIDERID: "165",
  //   WSCLIENTDOMAIN: "tongitskingdom.com",
  //   GAMEID: "5CB92264-2205-4869-860C-52F5F0799F99",
  //   DEVICETYPE: 3,
  //   WSCLIENTTYPE: 4
  // });
  // console.log("fpms init complete.");
  // expect(fpms.loginByPassword("fffffffffeb5adeafeb5adea00000000", "63", "8888866666", "888888", "", (res: FPResponse) => {
  //   console.log(`-----------------res=${JSON.stringify(res)}`);
  // }));
});
