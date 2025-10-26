// Generate proper password hash
import bcrypt from 'bcryptjs';

async function generateHash() {
  const password = 'Admin123!@#';
  const hash = await bcrypt.hash(password, 10);
  console.log('Password:', password);
  console.log('Hash:', hash);
  
  // Verify it works
  const isValid = await bcrypt.compare(password, hash);
  console.log('Hash verification:', isValid);
}

generateHash();