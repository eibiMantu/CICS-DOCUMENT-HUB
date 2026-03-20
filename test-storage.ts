import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

async function testUpload() {
  const fileContent = new Uint8Array([1, 2, 3]); // dummy content
  const fileRef = ref(storage, `test/${Date.now()}_test.pdf`);
  
  try {
    console.log('Uploading to:', fileRef.fullPath);
    await uploadBytes(fileRef, fileContent, { contentType: 'application/pdf' });
    console.log('Upload successful!');
    const url = await getDownloadURL(fileRef);
    console.log('Download URL:', url);
  } catch (e) {
    console.error('Upload failed:', e);
  }
}

testUpload();
