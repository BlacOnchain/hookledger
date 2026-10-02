import { check } from 'k6';
import http from 'k6/http';

export let options = {
    vus: 10,
    duration: '30s',
    thresholds: {
        'http_req_duration': ['p(95)<15'],
    },
};

export default function () {
    const url = 'http://localhost/api/webhooks/paystack';
    const payload = JSON.stringify({
        event: 'charge.success',
        data: {
            id: `k6_${Math.random()}`,
            reference: `ref_${Math.random()}`,
            amount: 5000,
            currency: 'NGN',
            customer: { email: 'k6@example.com' }
        }
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
            'x-paystack-signature': 'mock_signature_for_test', // In k6 we'd ideally compute this
        },
    };

    let res = http.post(url, payload, params);
    check(res, {
        'status is 200': (r) => r.status === 200,
    });
}
