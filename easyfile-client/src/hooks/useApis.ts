import { useCallback, useState } from 'react';
import apiClient from '../api/apiClient';

enum RequestMethod {
  GET,
  POST
}

const useApi = ({
  endpoint,
  method,
  body
}: {
  endpoint: string;
  method: RequestMethod;
  body: any;
}) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let response;
      switch (method) {
        case RequestMethod.GET:
          response = await apiClient.get(endpoint);
          break;
        case RequestMethod.POST:
          response = await apiClient.post(endpoint, body);
          break;
      }
      setData(response.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [endpoint, method, body]);

  return { data, loading, error, fetchData };
};

export { useApi, RequestMethod };
