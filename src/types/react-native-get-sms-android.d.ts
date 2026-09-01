declare module 'react-native-get-sms-android' {
  interface SmsAndroidModule {
    list: (options: string, fail: (error: string) => void, success: (count: number, messagesJson: string) => void) => void;
    addListener?: (event: string, callback: (message: string) => void) => () => void;
  }
  const SmsAndroid: SmsAndroidModule;
  export default SmsAndroid;
}