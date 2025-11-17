const CHROMA_API_KEY = 'ck-7eeZPfyzHKhxLw5Pn5vovqY6LV59q5DGeFkoM4a6uQB9';
const CHROMA_TENANT = '3a74e69d-c6aa-4134-b3ed-053049315142';
const CHROMA_DATABASE = 'Chatflex-memory';

async function testChromaCloud() {
  // Chroma Cloud uses tenant/database in path
  const baseURL = `https://api.trychroma.com/tenant/${CHROMA_TENANT}/database/${CHROMA_DATABASE}`;
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${CHROMA_API_KEY}`
  };

  try {
    console.log("Testing with tenant/database path...");
    console.log("URL:", baseURL);
    
    // Test: List collections
    const url = `${baseURL}/collections`;
    console.log("\nFetching:", url);
    
    const response = await fetch(url, { headers });
    console.log("Status:", response.status);
    console.log("Headers:", Object.fromEntries(response.headers));
    
    const text = await response.text();
    console.log("Response:", text);

    if (response.ok) {
      console.log("✅ SUCCESS!");
    } else {
      console.log("❌ Failed");
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testChromaCloud();