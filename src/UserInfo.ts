import DeviceInfo from 'react-native-device-info';
import * as Keychain from 'react-native-keychain';

export default class UserInfo {
  static async setBootpayInfo(key: string, val: any): Promise<any> {
    try {
      await Keychain.setGenericPassword(key, String(val), {
        service: key,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED, // 접근 가능 설정
      });
      return val;
    } catch (error) {
      console.error(`Error setting Bootpay info for key ${key}:`, error);

      // 특정 에러 코드에 따라 처리 (iOS와 Android 모두 고려)
      if (error.message.includes('null is not an object')) {
        console.warn('Keychain configuration or capability might be missing.');
      }

      throw error;
    }
  }

  static async getBootpayInfo(key: string, defaultVal: string): Promise<any> {
    try {
      const credentials = await Keychain.getGenericPassword({ service: key });
      if (credentials) {
        return credentials.password;
      } else {
        return defaultVal;
      }
    } catch (error) {
      console.error(`Error getting Bootpay info for key ${key}:`, error);
      return defaultVal;
    }
  }

  static async getBootpayUUID(): Promise<string> {
    const uuid = DeviceInfo.getUniqueId();
    await UserInfo.setBootpayInfo('uuid', uuid);
    return uuid;
  }

  static async getBootpaySK(): Promise<string> {
    return await UserInfo.getBootpayInfo('bootpay_sk', '');
  }

  static async setBootpaySK(val: string): Promise<any> {
    return await UserInfo.setBootpayInfo('bootpay_sk', val);
  }

  static async newBootpaySK(uuid: string, time: number): Promise<any> {
    return await UserInfo.setBootpaySK(`${uuid}_${time}`);
  }

  static async getBootpayLastTime(): Promise<number> {
    const lastTime = await UserInfo.getBootpayInfo('bootpay_last_time', '0');
    return parseInt(lastTime, 10);
  }

  static async setBootpayLastTime(val: number): Promise<any> {
    return await UserInfo.setBootpayInfo('bootpay_last_time', String(val));
  }

  static async getBootpayUserId(): Promise<string> {
    return await UserInfo.getBootpayInfo('bootpay_user_id', '');
  }

  static async setBootpayUserId(val: string): Promise<any> {
    return await UserInfo.setBootpayInfo('bootpay_user_id', val);
  }

  static async updateInfo(): Promise<void> {
    const uuid = await UserInfo.getBootpayUUID();
    const bootpaySK = await UserInfo.getBootpaySK();
    const lastTime = await UserInfo.getBootpayLastTime();
    const current = Date.now();

    if (!bootpaySK) await UserInfo.newBootpaySK(uuid, current);
    const isExpired = current - lastTime > 30 * 60 * 1000;
    if (isExpired) await UserInfo.newBootpaySK(uuid, current);

    await UserInfo.setBootpayLastTime(current);
  }
}
