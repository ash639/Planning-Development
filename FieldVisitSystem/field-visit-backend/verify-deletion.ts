
import axios from 'axios';

const API_URL = 'http://localhost:3000';

async function main() {
    try {
        console.log('1. Creating Test Org...');
        const orgRes = await axios.post(`${API_URL}/organizations`, { name: 'Delete Me Test' });
        const orgId = orgRes.data.id;
        console.log('   Org Created:', orgId);

        console.log('2. Creating Test User in Org...');
        const userRes = await axios.post(`${API_URL}/users`, {
            email: `deleteme_${Date.now()}@test.com`,
            name: 'Delete Me User',
            role: 'ADMIN',
            password: 'password123',
            organizationId: orgId
        });
        console.log('   User Created:', userRes.data.id);

        console.log('3. Deleting Org...');
        try {
            await axios.delete(`${API_URL}/organizations/${orgId}`);
            console.log('   DELETE Success!');
        } catch (e: any) {
            console.error('   DELETE FAILED');
            if (e.response) {
                console.error('   Status:', e.response.status);
                console.error('   Headers:', e.response.headers);
                console.error('   Data:', typeof e.response.data === 'string' ? e.response.data.substring(0, 200) : e.response.data);
            } else {
                console.error('   Error:', e.message);
            }
        }

        console.log('4. Verifying Deletion...');
        try {
            await axios.get(`${API_URL}/organizations/${orgId}`);
            console.error('   FAILED: Org still exists!');
        } catch (e: any) {
            if (e.response && e.response.status === 404) {
                console.log('   SUCCESS: Org Not Found (404) as expected.');
            } else {
                console.error('   Unexpected error fetching org:', e.message);
            }
        }

    } catch (e: any) {
        console.error('Test Failed:', e.response ? e.response.data : e.message);
    }
}

main();
