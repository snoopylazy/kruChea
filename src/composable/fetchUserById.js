

import API_CONFIGS from '@/api/config';
import { useBranchStore } from '@/store/branchStore';
import axios from 'axios';








export async function fetchUserById() {
    try {
        const branchStore = useBranchStore();
        const params = {
            populate: JSON.stringify(['roleId']),
            dynamicConditions: JSON.stringify([
                {
                    field: '_id',
                    operator: "==",
                    value: branchStore.getUserId,
                },
            ])
        };
        const response = await axios.get(`${API_CONFIGS.BASE_URL}/loan/api/getAllDocs/User`, { params ,headers: API_CONFIGS.headers });
        return response.data.data[0] || null;
    } catch (err) {
        console.log("failed to fetch data", err)
    }
}

