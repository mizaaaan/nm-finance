<?php
declare(strict_types=1);

// Forward only the app's API and Identity paths to its existing Netlify
// backend. The fixed origin prevents this endpoint from becoming an open proxy.
$path = $_GET['__proxy_path'] ?? '';
if (!is_string($path) || !preg_match('#^/(?:api(?:/|$)|\.netlify/identity(?:/|$))#', $path)) {
    http_response_code(404);
    exit;
}

$query = $_SERVER['QUERY_STRING'] ?? '';
$query = preg_replace('/(?:^|&)__proxy_path=[^&]*/', '', $query) ?? '';
$query = ltrim($query, '&');
$url = 'https://nm-finance.netlify.app' . $path . ($query !== '' ? '?' . $query : '');

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
if (!in_array($method, ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], true)) {
    http_response_code(405);
    header('Allow: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    exit;
}

$headers = ['Accept: application/json'];
$authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
if ($authorization === '' && function_exists('getallheaders')) {
    foreach (getallheaders() as $name => $value) {
        if (strcasecmp($name, 'Authorization') === 0) {
            $authorization = $value;
            break;
        }
    }
}
if ($authorization !== '') {
    $headers[] = 'Authorization: ' . $authorization;
}
if (!empty($_SERVER['CONTENT_TYPE'])) {
    $headers[] = 'Content-Type: ' . $_SERVER['CONTENT_TYPE'];
}

$options = [
    'http' => [
        'method' => $method,
        'header' => implode("\r\n", $headers),
        'content' => file_get_contents('php://input') ?: '',
        'ignore_errors' => true,
        'follow_location' => 0,
        'timeout' => 30,
    ],
];

$body = @file_get_contents($url, false, stream_context_create($options));
$responseHeaders = $http_response_header ?? [];
$status = 502;
foreach ($responseHeaders as $responseHeader) {
    if (preg_match('#^HTTP/\S+\s+(\d{3})#', $responseHeader, $matches)) {
        $status = (int)$matches[1];
        http_response_code($status);
    } elseif (stripos($responseHeader, 'Content-Type:') === 0 || stripos($responseHeader, 'Cache-Control:') === 0 || stripos($responseHeader, 'Location:') === 0) {
        header($responseHeader, true);
    }
}

if ($body === false) {
    if ($status === 502) {
        http_response_code(502);
    }
    echo json_encode(['error' => 'The application backend could not be reached.']);
    exit;
}

echo $body;
