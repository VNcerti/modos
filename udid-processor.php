<?php
// udid-processor.php
header('Content-Type: text/plain; charset=utf-8');

// Cho phép CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Xử lý preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Lấy email từ tham số URL
$email = isset($_GET['email']) ? urldecode($_GET['email']) : '';

// Xử lý dữ liệu từ thiết bị iOS
$udid = '';

// Cách 1: Xử lý POST request (từ thiết bị iOS)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Đọc raw input
    $input = file_get_contents('php://input');
    
    if ($input) {
        // Log dữ liệu nhận được để debug
        $logData = date('Y-m-d H:i:s') . " - POST Data: " . substr($input, 0, 500) . "\n";
        file_put_contents('udid_log.txt', $logData, FILE_APPEND);
        
        // Parse XML
        $xml = simplexml_load_string($input);
        
        if ($xml) {
            // Convert XML to array để dễ xử lý
            $data = json_decode(json_encode((array)$xml), true);
            
            // Debug log
            $debugLog = date('Y-m-d H:i:s') . " - Parsed Data: " . json_encode($data) . "\n";
            file_put_contents('udid_debug.txt', $debugLog, FILE_APPEND);
            
            // Tìm UDID trong cấu trúc XML
            $udid = findUdidInXml($data);
        }
    }
}

// Cách 2: Xử lý GET request với tham số trực tiếp (cho testing)
if (empty($udid) && isset($_GET['UDID'])) {
    $udid = $_GET['UDID'];
}

// Cách 3: Xử lý dữ liệu từ form-data
if (empty($udid) && isset($_POST['UDID'])) {
    $udid = $_POST['UDID'];
}

// Hàm tìm UDID trong cấu trúc XML
function findUdidInXml($data) {
    $udid = '';
    
    if (isset($data['dict'])) {
        $dict = $data['dict'];
        
        // Cấu trúc thường gặp: dict -> key + string
        if (isset($dict['key']) && isset($dict['string'])) {
            $keys = is_array($dict['key']) ? $dict['key'] : [$dict['key']];
            $values = is_array($dict['string']) ? $dict['string'] : [$dict['string']];
            
            // Tìm key 'UDID' và lấy value tương ứng
            foreach ($keys as $index => $key) {
                if ($key === 'UDID' && isset($values[$index])) {
                    $udid = $values[$index];
                    break;
                }
            }
        }
        
        // Thử cách parse khác
        if (empty($udid) && isset($dict[0])) {
            $arrayData = $dict[0];
            if (isset($arrayData['key']) && isset($arrayData['string'])) {
                $keys = is_array($arrayData['key']) ? $arrayData['key'] : [$arrayData['key']];
                $values = is_array($arrayData['string']) ? $arrayData['string'] : [$arrayData['string']];
                
                foreach ($keys as $index => $key) {
                    if ($key === 'UDID' && isset($values[$index])) {
                        $udid = $values[$index];
                        break;
                    }
                }
            }
        }
    }
    
    return $udid;
}

// Nếu có UDID, chuyển hướng về trang thành công
if (!empty($udid) && !empty($email)) {
    // Log thành công
    $successLog = date('Y-m-d H:i:s') . " - SUCCESS - Email: $email - UDID: $udid\n";
    file_put_contents('udid_success.txt', $successLog, FILE_APPEND);
    
    // Chuyển hướng về trang account
    $redirectUrl = "https://modos.site/account.html?udid_verified=success&udid=" . urlencode($udid) . "&email=" . urlencode($email);
    header("Location: $redirectUrl");
    exit();
}

// Nếu không có UDID, trả về trang HTML với form thủ công
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Xác minh thiết bị - XSpace Store</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f7;
            color: #1d1d1f;
            margin: 0;
            padding: 20px;
            line-height: 1.5;
        }
        .container {
            max-width: 600px;
            margin: 50px auto;
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        h1 {
            color: #007aff;
            margin-bottom: 20px;
            font-size: 24px;
        }
        .status {
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .status.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .status.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .status.info {
            background: #d1ecf1;
            color: #0c5460;
            border: 1px solid #bee5eb;
        }
        form {
            margin: 20px 0;
        }
        input[type="text"] {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
            margin-bottom: 10px;
            box-sizing: border-box;
        }
        button {
            background: #007aff;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            width: 100%;
        }
        button:hover {
            background: #0056cc;
        }
        .manual-link {
            display: block;
            margin-top: 20px;
            text-align: center;
            color: #007aff;
            text-decoration: none;
        }
        .manual-link:hover {
            text-decoration: underline;
        }
        .device-info {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            font-family: monospace;
            font-size: 14px;
            overflow-x: auto;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1><i class="fas fa-mobile-alt"></i> Xác minh thiết bị iOS</h1>
        
        <?php if (!empty($udid) && !empty($email)): ?>
            <div class="status success">
                <h3>✅ Xác minh thành công!</h3>
                <p>Thiết bị của bạn đã được xác minh.</p>
                <div class="device-info">
                    <strong>UDID:</strong> <?php echo htmlspecialchars($udid); ?><br>
                    <strong>Email:</strong> <?php echo htmlspecialchars($email); ?>
                </div>
                <p>Đang chuyển hướng về trang tài khoản...</p>
            </div>
            <script>
                setTimeout(function() {
                    window.location.href = "https://modos.site/account.html?udid_verified=success&udid=<?php echo urlencode($udid); ?>&email=<?php echo urlencode($email); ?>";
                }, 2000);
            </script>
        <?php elseif ($_SERVER['REQUEST_METHOD'] === 'POST'): ?>
            <div class="status info">
                <h3>⚠️ Đang xử lý dữ liệu thiết bị</h3>
                <p>Vui lòng chờ trong khi hệ thống xử lý thông tin thiết bị của bạn.</p>
                
                <?php 
                // Hiển thị dữ liệu nhận được để debug
                if (isset($input)) {
                    echo '<div class="device-info">';
                    echo '<strong>Raw Data:</strong><br>';
                    echo htmlspecialchars(substr($input, 0, 500)) . '...';
                    echo '</div>';
                }
                ?>
            </div>
            
            <!-- Form thủ công cho trường hợp tự động thất bại -->
            <div class="status info">
                <h4>Nếu không tự động chuyển hướng, vui lòng nhập thủ công:</h4>
                <form method="get" action="">
                    <input type="hidden" name="email" value="<?php echo htmlspecialchars($email); ?>">
                    <input type="text" name="UDID" placeholder="Nhập UDID thiết bị" required>
                    <button type="submit">Xác minh thủ công</button>
                </form>
            </div>
        <?php else: ?>
            <div class="status info">
                <h3>📱 Chờ dữ liệu từ thiết bị</h3>
                <p>Vui lòng đợi trong khi thiết bị của bạn gửi thông tin xác minh.</p>
                <p>Email: <strong><?php echo htmlspecialchars($email); ?></strong></p>
                
                <?php if (isset($_GET['debug'])): ?>
                    <div class="device-info">
                        <strong>Debug Info:</strong><br>
                        Method: <?php echo $_SERVER['REQUEST_METHOD']; ?><br>
                        Headers: <?php echo json_encode(getallheaders()); ?>
                    </div>
                <?php endif; ?>
            </div>
            
            <!-- Form thủ công -->
            <div class="status">
                <h4>Xác minh thủ công:</h4>
                <form method="get" action="">
                    <input type="hidden" name="email" value="<?php echo htmlspecialchars($email); ?>">
                    <input type="text" name="UDID" placeholder="Nhập UDID thiết bị (nếu biết)" required>
                    <button type="submit">Xác minh thủ công</button>
                </form>
            </div>
        <?php endif; ?>
        
        <a href="https://modos.site/account.html" class="manual-link">← Quay về trang tài khoản</a>
        
        <div class="status" style="margin-top: 30px; font-size: 12px; color: #666;">
            <p><strong>Lưu ý:</strong> Quá trình này chỉ thu thập UDID để xác minh thiết bị và chống chia sẻ tài khoản.</p>
            <p>Nếu gặp vấn đề, vui lòng liên hệ hỗ trợ.</p>
        </div>
    </div>
    
    <script>
        // Tự động thử submit form nếu có dữ liệu POST
        document.addEventListener('DOMContentLoaded', function() {
            <?php if ($_SERVER['REQUEST_METHOD'] === 'POST' && empty($udid)): ?>
                // Sau 3 giây, thử lấy UDID từ URL nếu có
                setTimeout(function() {
                    const urlParams = new URLSearchParams(window.location.search);
                    const urlUdid = urlParams.get('UDID');
                    const urlEmail = urlParams.get('email');
                    
                    if (urlUdid && urlEmail) {
                        window.location.href = `https://modos.site/account.html?udid_verified=success&udid=${encodeURIComponent(urlUdid)}&email=${encodeURIComponent(urlEmail)}`;
                    }
                }, 3000);
            <?php endif; ?>
            
            // Auto-redirect sau 10 giây nếu không có hành động
            setTimeout(function() {
                window.location.href = "https://modos.site/account.html";
            }, 10000);
        });
    </script>
    
    <!-- Font Awesome for icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</body>
</html>
