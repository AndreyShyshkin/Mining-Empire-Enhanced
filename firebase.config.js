// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app'
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
	apiKey: 'AIzaSyDCYUHZa1XuEH1fky3WkgOkWdvH79TdfXE',
	authDomain: 'mining-empire-enhanced.firebaseapp.com',
	databaseURL:
		'https://mining-empire-enhanced-default-rtdb.europe-west1.firebasedatabase.app',
	projectId: 'mining-empire-enhanced',
	storageBucket: 'mining-empire-enhanced.firebasestorage.app',
	messagingSenderId: '287033597190',
	appId: '1:287033597190:web:529a88526cef2040b05287',
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
