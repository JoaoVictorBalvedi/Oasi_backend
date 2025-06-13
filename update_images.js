const dbPool = require('./db');
const fs = require('fs');
const path = require('path');

async function updateProductImages() {
  const conn = await dbPool.getConnection();
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'update_product_images.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute the update
    await conn.query(sql);
    console.log('Product images updated successfully!');
  } catch (error) {
    console.error('Error updating product images:', error);
  } finally {
    conn.release();
  }
}

// Run the update
updateProductImages(); 