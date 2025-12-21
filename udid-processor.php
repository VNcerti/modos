<?php
// udid-processor.php
header('Content-Type: text/plain; charset=utf-8');

// Lấy email từ tham số URL
$email = isset($_GET['email']) ? urldecode($_GET['email']) : '';

// Kiểm tra nếu có dữ liệu POST từ thiết bị iOS
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Đọc dữ liệu XML từ request
    $xmlData = file_get_contents('php://input');
    
    if ($xmlData) {
        // Parse XML để lấy UDID
        $xml = simplexml_load_string($xmlData);
        
        if ($xml) {
            // Lấy UDID từ XML (UDID là phần tử đầu tiên trong mảng)
            $udid = '';
            if (isset($xml->dict->key)) {
                $keys = $xml->dict->key;
                foreach ($keys as $key) {
                    if ((string)$key === 'UDID') {
                        // Lấy value tương ứng với key UDID
                        $next = $key->xpath('following-sibling::*[1]');
                        if ($next) {
                            $udid = (string)$next[0];
                            break;
                        }
                    }
                }
            }
            
            // Nếu không tìm thấy UDID bằng cách trên, thử cách khác
            if (empty($udid)) {
                // Thử parse theo cách khác
                $data = (array)$xml->dict;
                if (isset($data['key']) && is_array($data['key'])) {
                    foreach ($data['key'] as $index => $key) {
                        if ($key == 'UDID' && isset($data['string'][$index])) {
                            $udid = $data['string'][$index];
                            break;
                        }
                    }
                }
            }
            
            if ($udid && strlen($udid) > 10) {
                // Tạo URL chuyển hướng về account.html với thông tin UDID
                $redirectUrl = "https://modos.site/account.html?udid_verified=success&udid=" . urlencode($udid) . "&email=" . urlencode($email);
                
                // Ghi log để debug
                $logData = date('Y-m-d H:i:s') . " - Email: $email - UDID: $udid\n";
                file_put_contents('udid_log.txt', $logData, FILE_APPEND);
                
                // Chuyển hướng về trang account
                header("Location: $redirectUrl");
                exit();
            }
        }
    }
}

// Nếu không có dữ liệu POST, hiển thị trang lỗi đơn giản
$redirectUrl = "https://modos.site/account.html?udid_verified=error";
header("Location: $redirectUrl");
exit();
?>

<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Xác minh thiết bị - XSpace Store</title>
</head>
<body>
    <script>
        setTimeout(function() {
            window.location.href = "https://modos.site/account.html?udid_verified=error";
        }, 3000);
    </script>
    <p>Đang xử lý xác minh thiết bị... Nếu không tự động chuyển hướng, <a href="https://modos.site/account.html">bấm vào đây</a>.</p>
</body>
</html>
