const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

let sessionToken: string | null = typeof window !== 'undefined' ? localStorage.getItem('arctic_session_token') : null;

const getHeaders = () => {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (sessionToken) {
        headers['X-Session-Token'] = sessionToken;
    }
    return headers;
};

export const api = {
    healthCheck: async () => {
        try {
            const res = await fetch(`${API_BASE}/health`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!res.ok) throw new Error('Health check failed');
            return await res.json();
        } catch (error) {
            throw new Error('Backend is not responding');
        }
    },
    connect: async (uri: string, aws_access_key_id?: string, aws_secret_access_key?: string, aws_region?: string, aws_auth: boolean = true) => {
        const res = await fetch(`${API_BASE}/connect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                uri,
                aws_access_key_id: aws_access_key_id || undefined,
                aws_secret_access_key: aws_secret_access_key || undefined,
                aws_region: aws_region || undefined,
                aws_auth
            }),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.detail || 'Failed to connect');
        }
        const data = await res.json();
        sessionToken = data.token;
        if (typeof window !== 'undefined') {
            localStorage.setItem('arctic_session_token', data.token);
        }
        return data;
    },

    getLibraries: async () => {
        const res = await fetch(`${API_BASE}/libraries`, {
            headers: getHeaders(),
            cache: 'no-store'
        });
        if (!res.ok) throw new Error('Failed to fetch libraries');
        return res.json();
    },

    getSymbols: async (library: string) => {
        const res = await fetch(`${API_BASE}/libraries/${library}/symbols`, {
            headers: getHeaders(),
            cache: 'no-store'
        });
        if (!res.ok) throw new Error('Failed to fetch symbols');
        return res.json();
    },

    getData: async (library: string, symbol: string, query?: string, version?: number, offset: number = 0) => {
        const params = new URLSearchParams();
        if (query) params.append('query', query);
        if (version !== undefined) params.append('version', version.toString());
        params.append('offset', offset.toString());

        const res = await fetch(`${API_BASE}/libraries/${library}/symbols/${symbol}/data?${params.toString()}`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch data');
        return res.json();
    },

    getCSV: async (library: string, symbol: string, version?: number) => {
        const params = new URLSearchParams();
        if (version !== undefined) params.append('version', version.toString());

        const res = await fetch(`${API_BASE}/libraries/${library}/symbols/${symbol}/csv?${params.toString()}`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to download CSV');
        return res.blob();
    },

    createLibrary: async (name: string) => {
        const res = await fetch(`${API_BASE}/libraries`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ name })
        });
        if (!res.ok) throw new Error('Failed to create library');
        return res.json();
    },

    uploadSymbol: async (library: string, symbol: string, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('symbol_name', symbol);

        // Note: Content-Type header should not be set manually for FormData, browser sets it with boundary
        const headers = getHeaders();
        // create a new headers object excluding 'Content-Type' for this request
        const uploadHeaders: any = {};
        if (headers['X-Session-Token']) {
            uploadHeaders['X-Session-Token'] = headers['X-Session-Token'];
        }

        const res = await fetch(`${API_BASE}/libraries/${library}/symbols/upload`, {
            method: 'POST',
            headers: uploadHeaders,
            body: formData
        });
        if (!res.ok) throw new Error('Failed to upload symbol');
        return res.json();
    },

    deleteSymbol: async (library: string, symbol: string) => {
        const res = await fetch(`${API_BASE}/libraries/${library}/symbols/${symbol}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!res.ok) throw new Error('Failed to delete symbol');
        return res.json();
    },

    updateData: async (library: string, symbol: string, data: any[], indexCol?: string) => {
        const res = await fetch(`${API_BASE}/libraries/${library}/symbols/${symbol}/data`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ data, index_col: indexCol })
        });
        if (!res.ok) throw new Error('Failed to update data');
        return res.json();
    },

    getVersions: async (library: string, symbol: string) => {
        const res = await fetch(`${API_BASE}/libraries/${library}/symbols/${symbol}/versions`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch versions');
        return res.json();
    },

    disconnect: () => {
        sessionToken = null;
        if (typeof window !== 'undefined') {
            localStorage.removeItem('arctic_session_token');
        }
    }
};
