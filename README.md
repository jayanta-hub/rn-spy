# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
# rn-spy

## Google Drive sync

When a sender device is online, it uploads its current call-log and SMS export to the sync server. The server stores a JSON file in Google Drive; service-account credentials remain on the server and are never included in the app.

This app syncs call-log metadata only. It does not capture or upload call-recording audio.

## Microphone recordings

The **Call History** screen includes a visible, user-started microphone recorder. Recordings are saved locally in the app's document storage and are not sent to Google Drive. The recorder can remain active in the background only while Android shows its required persistent recording notification. It does not capture the remote participant's phone-call audio; Android restricts that capability for ordinary apps. Obtain consent from everyone being recorded.

### Server setup

1. In Google Cloud, enable the Google Drive API and create a service account.
2. Create the target Drive folder and share it with the service account's email address as an editor.
3. Copy `.env.example` to `.env`, replace its values with the service-account email, private key, and target folder ID, then load those variables in the process that starts the server.
4. Start the server with the configured environment, for example:

   ```bash
   set -a; source .env; set +a; npm run server
   ```

Each successful sync creates a timestamped `call-sms-*.json` file in the configured folder. If the device is offline or Drive is unavailable, the app retains the payload in its queue and retries after connectivity returns.
