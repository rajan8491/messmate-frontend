import {protectedApi} from './api';

export const fetchHostelsAdminAPI = async () => {
    const response = await protectedApi.get('/admin/hostels');
    return response.data;
};

export const addHostelAPI = async (hostelData, idempotencyKey) => {
    const response = await protectedApi.post('/admin/hostels', hostelData, {headers: {'Idempotency-Key': idempotencyKey}});
    return response.data;
};

export const updateHostelDetailsAPI = async (hostelId, updatedData) => {
    const response = await protectedApi.put(`/admin/hostels/${hostelId}`, updatedData);
    return response.data;
};

export const sendRemoveHostelOtpAPI = async (otpSendData) => {
    const response = await protectedApi.post(`/admin/hostels/remove/send-otp`, otpSendData);
    return response.data;
};

export const removeHostelAPI = async (hostelId, otpVerifyData) => {
    const response = await protectedApi.delete(`/admin/hostels/${hostelId}/remove`, 
        {
            data: otpVerifyData
        }
    );
    return response.data;
};

export const fetchStudentsByHostelAPI = async (hostelId) => {
    const response = await protectedApi.get(`/admin/hostels/${hostelId}/students`);
    return response.data;
};

export const sendRemoveAccountsOtpAPI = async (otpSendData) => {
    const response = await protectedApi.post(`/admin/students/remove/send-otp`, otpSendData);
    return response.data;
};

export const removeAccountsAPI = async (hostelId, removeStudentVerifyData) => {
    // Axios DELETE requests require the body payload to be wrapped in a 'data' property
    const response = await protectedApi.delete(`/admin/hostels/${hostelId}/students/remove`, {
        data: removeStudentVerifyData
    });
    return response.data;
};