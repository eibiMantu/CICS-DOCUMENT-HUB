import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function testAddDocNamed() {
  console.log('Using named database:', firebaseConfig.firestoreDatabaseId);
  try {
    const docRef = await addDoc(collection(db, 'documents'), {
      title: 'Test Doc Named',
      category: 'Other',
      fileUrl: 'https://example.com/test.pdf',
      fileSize: '1 MB',
      uploadedBy: 'test-uid',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      allowedPrograms: [],
      downloadCount: 0
    });
    console.log('Document written with ID: ', docRef.id);
  } catch (e) {
    console.error('Error adding document to named: ', e);
  }
}

testAddDocNamed();
