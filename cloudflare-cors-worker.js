export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return new Response('Vui lòng cung cấp tham số ?url=', { status: 400 });
    }

    try {
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: request.headers,
      });

      // Tạo CORS headers cho phép mọi nguồn truy cập
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      };

      // Xử lý preflight request
      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }

      // Trả dữ liệu về cho client kèm theo CORS headers
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...Object.fromEntries(response.headers),
          ...corsHeaders,
        },
      });

    } catch (err) {
      return new Response(`Lỗi Proxy: ${err.message}`, { status: 500 });
    }
  },
};
