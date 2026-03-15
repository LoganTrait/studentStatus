import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
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
    active: true,
  });
}

export async function reopenSession(sessionId: string) {
  await updateDoc(
    doc(db, "sessions", sessionId),
    { active: true }
  );
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
      active: true,
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

  const ref = doc(db, "sessions", sessionId, "students", studentId);

  await updateDoc(ref, {
    status,
    helpText,
    updatedAt: serverTimestamp(),
  });

  // If help request then log it
  if (status === "help") {

    const studentSnap = await getDoc(ref);
    const studentData = studentSnap.data();

    const helpRef = await addDoc(
      collection(db, "sessions", sessionId, "helpRequests"),
      {
        studentId,
        studentName: studentData?.name || "",
        helpText,
        requestedAt: serverTimestamp(),
        resolvedAt: null,
      }
    );

    // store request ID on student
    await updateDoc(ref, {
      currentHelpRequestId: helpRef.id
    });
  }
}

// Teacher resolves help request
export async function resolveHelpRequest(sessionId: string, studentId: string) {

  const studentRef = doc(db, "sessions", sessionId, "students", studentId);
  const studentSnap = await getDoc(studentRef);
  const studentData = studentSnap.data();

  if (!studentData?.currentHelpRequestId) return;

  // resolve help request
  await updateDoc(
    doc(db, "sessions", sessionId, "helpRequests", studentData.currentHelpRequestId),
    {
      resolvedAt: serverTimestamp()
    }
  );

  // update student status
  await updateDoc(studentRef, {
    status: "working",
    helpText: "",
    updatedAt: serverTimestamp(),
    currentHelpRequestId: null
  });
}

// Leave session
export async function leaveSession(sessionId: string, studentId: string) {
  await updateDoc(
    doc(db, "sessions", sessionId, "students", studentId),
    {
      active: false,
      updatedAt: serverTimestamp(),
    }
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

// Listen to student (individual for student)
export function listenToStudent(
  sessionId: string,
  studentId: string,
  callback: (data: any) => void
) {
  return onSnapshot(
    doc(db, "sessions", sessionId, "students", studentId),
    (snap) => {
      if (!snap.exists()) return;
      callback({ id: snap.id, ...snap.data() });
    }
  );
}

// Listen to students 
export function listenToStudents(
  sessionId: string,
  callback: (students: any[]) => void
) {
  const students: any[] = [];

  return onSnapshot(
    collection(db, "sessions", sessionId, "students"),
    (snap) => {

      snap.docChanges().forEach((change) => {
        const data = { id: change.doc.id, ...change.doc.data() };

        if (change.type === "added") {
          students.push(data);
        }

        if (change.type === "modified") {
          const i = students.findIndex(s => s.id === data.id);
          if (i !== -1) students[i] = data;
        }

        if (change.type === "removed") {
          const i = students.findIndex(s => s.id === data.id);
          if (i !== -1) students.splice(i,1);
        }
      });

      callback([...students]);
    }
  );
}

// Remove student from dashboard
export async function removeStudent(
  sessionId: string,
  studentId: string
) {
  await updateDoc(
    doc(db, "sessions", sessionId, "students", studentId),
    {
      active: false,
      updatedAt: serverTimestamp()
    }
  );
}

// Delete session 
// export async function deleteSession(sessionId: string) {
//   await deleteDoc(doc(db, "sessions", sessionId));
// }

export async function closeSession(sessionId: string) {
  await updateDoc(
    doc(db, "sessions", sessionId),
    {
      active: false,
      closedAt: serverTimestamp()
    }
  );
}