import { PermissionsAndroid, Platform } from 'react-native';

export type PermissionState = {
  callLog: boolean;
  sms: boolean;
};

async function requestAndroidPermission(permission: string, title: string, message: string) {
  const result = await PermissionsAndroid.request(permission as never, {
    title,
    message,
    buttonPositive: 'Allow',
    buttonNegative: 'Deny',
  });
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export async function requestCallLogPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  return requestAndroidPermission(
    PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
    'Call Log Access',
    'This app needs call log access to back up your call history to your configured device. Data is only shared with your sync server.',
  );
}

export async function requestSmsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  return requestAndroidPermission(
    PermissionsAndroid.PERMISSIONS.READ_SMS,
    'SMS Access',
    'This app needs SMS access to back up your messages to your configured device. Data is only shared with your sync server.',
  );
}

export async function checkPermissions(): Promise<PermissionState> {
  if (Platform.OS !== 'android') {
    return { callLog: false, sms: false };
  }

  const callLog = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_CALL_LOG);
  const sms = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
  return { callLog, sms };
}

export async function requestAllPermissions(): Promise<PermissionState> {
  const callLog = await requestCallLogPermission();
  const sms = await requestSmsPermission();
  return { callLog, sms };
}
