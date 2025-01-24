import axios, { AxiosError } from "axios";

export const getAuthenticatedAxios = ({
  token,
  getUpdatedToken,
}: {
  token: string | undefined;
  getUpdatedToken: () => Promise<string | undefined>;
}) => {
  if (!token) {
    throw new Error(
      "Token is required to create an authenticated axios instance",
    );
  }

  const authenticatedAxios = axios.create({
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const createErrorInterceptor = () => {
    let retries = 0;

    return async (error: AxiosError) => {
      const { config } = error;
      const status = error.response?.status;

      if ((status === 403 || status === 401) && retries < 3) {
        retries = retries + 1;

        const newAccessToken = await getUpdatedToken();

        return authenticatedAxios({
          ...config,
          headers: {
            Authorization: `Bearer ${newAccessToken}`,
          },
        });
      }

      return Promise.reject(error);
    };
  };

  authenticatedAxios.interceptors.response.use(
    (response) => response,
    createErrorInterceptor(),
  );

  return authenticatedAxios;
};
