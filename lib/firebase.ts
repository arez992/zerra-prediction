import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDkBblQnBRuKaCR2QmQd_-xc_8c5bxmtKA",
  authDomain: "zerra-prediction.firebaseapp.com",
  projectId: "zerra-prediction",
  storageBucket: "zerra-prediction.firebasestorage.app",
  messagingSenderId: "1056641555268",
  appId: "1:1056641555268:web:da1d3d14e67403a7f71511",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);