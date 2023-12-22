import base64 from 'react-native-base64';
import DeviceInfo from 'react-native-device-info';
import { NativeModules } from 'react-native';

// TypeScript에서 NativeModules.Aes를 사용하려면 해당 모듈에 대한 타입을 선언해야 합니다.
declare module 'react-native' {
  interface NativeModulesStatic {
    Aes: {
      encrypt: (data: string, key: string, iv: string) => Promise<string>;
      hmac256: (data: string, key: string) => Promise<string>;
    };
  }
}

// getRandomKey 함수의 반환 타입을 명시
const getRandomKey = (length: number): string => {
  var text = '';
  var keys = 'abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  for (var i = 0; i < length; i++)
    text += keys.charAt(Math.floor(Math.random() * keys.length));

  return text;
};

// getSessionKey 함수의 반환 타입을 명시
const getSessionKey = async (key: string, iv: string): Promise<string> => {
  const keyValue = base64.encode(key);
  const ivValue = base64.encode(iv);

  return `${keyValue}##${ivValue}`;
};

// stringToHex 함수의 반환 타입을 명시
const stringToHex = (str: string): string => {
  var hex = '';
  for (var i = 0, l = str.length; i < l; i++) {
    hex += str.charCodeAt(i).toString(16);
  }
  return hex;
};

// userTrace 함수의 반환 타입을 명시
const userTrace = async (applicationId: string, userId: string, phone: string, email: string, gender: string, birth: string, area: string): Promise<any> => {
  try {
    const payload = {
      "id": userId,
      "ver": DeviceInfo.getVersion(),
      "application_id": applicationId,
      "phone": phone,
      "email": email,
      "gender": gender,
      "birth": birth,
      "area": area,
    };

    var key = getRandomKey(32);
    var iv = getRandomKey(16);

    try {
      const data = await NativeModules.Aes.encrypt(JSON.stringify(payload), stringToHex(key), stringToHex(iv));
      const response = await fetch(
        'https://analytics.bootpay.co.kr/login',
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            data: data,
            session_key: await getSessionKey(key, iv)
          })
        }
      );
      const json = await response.json();
      return json;
    } catch (e) {
      console.log(e);
    }
  } catch (error) {
    console.error(error);
  }
};

// pageTrace 함수의 반환 타입을 명시
const pageTrace = async (applicationId: string, url: string, pageType: string, items: any): Promise<any> => {
  try {
    const payload = {
      "application_id": applicationId,
      "url": url,
      "page_type": pageType,
      "items": items,
      "referer": '',
    };

    var key = getRandomKey(32);
    var iv = getRandomKey(16);

    try {
      const data = await NativeModules.Aes.encrypt(JSON.stringify(payload), stringToHex(key), stringToHex(iv));
      const response = await fetch(
        'https://analytics.bootpay.co.kr/call',
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            data: data,
            session_key: await getSessionKey(key, iv)
          })
        }
      );
      const json = await response.json();
      return json;
    } catch (e) {
      console.log(e);
    }
  } catch (error) {
    console.error(error);
  }
};

// strEncode 함수의 반환 타입을 명시
// const strEncode = async (str: string, key: string, iv: string): Promise<string> => {
//   return await NativeModules.Aes.encrypt(str, key, iv).then(cipher => {
//     return NativeModules.Aes.hmac256(cipher, key).then(hash => {
//       console.log('HMAC', hash);
//       return hash;
//     });
//   });
// };

export { userTrace, pageTrace };
