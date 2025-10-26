// Create Global Admin User Script
import bcrypt from 'bcryptjs';

const API_BASE = 'http://127.0.0.1:8787';

async function createGlobalAdmin() {
  try {
    console.log('Creating global admin user...');
    
    // Create the global admin user
    const response = await fetch(`${API_BASE}/api/global-admin/create-first-admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@finhome360.com',
        name: 'Global Administrator',
        password: 'Admin123!@#'
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Global admin user created successfully!');
      console.log('📧 Email: admin@finhome360.com');
      console.log('🔐 Password: Admin123!@#');
      console.log('🌐 Access at: http://localhost:3000/admin');
      console.log('\nUser details:', result.data);
    } else {
      console.error('❌ Failed to create global admin:', result);
    }
  } catch (error) {
    console.error('❌ Error creating global admin:', error.message);
  }
}

createGlobalAdmin();