import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

/* Firebase functions */

// Create session
export async function createSession(sessionId: string, name: string) {
  await setDoc(doc(db, "sessions", sessionId), {
    name,
    createdAt: serverTimestamp(),
  });
}

// Get session
export async function getSession(sessionId: string) {
  const snap = await getDoc(doc(db, "sessions", sessionId));
  return snap.exists() ? snap.data() : null;
}

// Student join session
export async function joinSession(sessionId: string, studentName: string) {
  const ref = await addDoc(
    collection(db, "sessions", sessionId, "students"),
    {
      name: studentName,
      status: "working",
      helpText: "",
      updatedAt: serverTimestamp(),
    }
  );
  return ref.id;
}

// Update status
export async function updateStudentStatus(
  sessionId: string,
  studentId: string,
  status: "working" | "help" | "dnd",
  helpText = ""
) {
  await updateDoc(
    doc(db, "sessions", sessionId, "students", studentId),
    {
      status,
      helpText,
      updatedAt: serverTimestamp(),
    }
  );
}

// Leave session
export async function leaveSession(sessionId: string, studentId: string) {
  await deleteDoc(
    doc(db, "sessions", sessionId, "students", studentId)
  );
}

// Listen to room for student
export function listenToRoom(
  sessionId: string,
  callback: (roomName: string | null) => void
) {
  return onSnapshot(doc(db, "sessions", sessionId), (snap) => {
    if (!snap.exists()) callback(null);
    else callback(snap.data().name || "");
  });
}

// Listen to students 
export function listenToStudents(
  sessionId: string,
  callback: (students: any[]) => void
) {
  return onSnapshot(
    collection(db, "sessions", sessionId, "students"),
    (snap) => {
      callback(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      );
    }
  );
}

// Remove student from dashboard
export async function removeStudent(
  sessionId: string,
  studentId: string
) {
  await deleteDoc(
    doc(db, "sessions", sessionId, "students", studentId)
  );
}

// Delete session 
export async function deleteSession(sessionId: string) {
  await deleteDoc(doc(db, "sessions", sessionId));
}