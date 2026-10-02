import { check } from 'k6';
import http from 'k6/http';

export let options = {
    vus: 10,
    duration: '30s',
    thresholds: {
        'http_req_duration': ['p(95)<15'], // 95% of requests must be under 15ms
    },
};

export default function () {
    const url = 'http://localhost/api/webhooks/paystack';
    const payload = JSON.stringify({
        id: `k6_${Math.random()}`,
        event: 'charge.success',
        reference: 'k6_ref',
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
            'x-paystack-signature': 'mock_signature_for_test',
        },
    };

    let res = http.post(url, payload, params);
    check(res, {
        'status is 200': (r) => r.status === 200,
    });
}
