<?php
// Endpoint simples para enviar mensagens via UltraMsg (exemplo usando cURL).
// ATENÇÃO: ajuste 'YOUR_INSTANCE_ID' e 'YOUR_ULTRAMSG_TOKEN' abaixo com suas credenciais reais.
// Recomendado: proteger este endpoint com autenticação (token, CORS, etc.) antes de usar em produção.

header('Content-Type: application/json');

// Ler entrada JSON
$input = json_decode(file_get_contents('php://input'), true);

$instance = 'YOUR_INSTANCE_ID'; // substitua pelo seu ID de instância UltraMsg
$token = 'YOUR_ULTRAMSG_TOKEN'; // substitua pelo seu token UltraMsg

// Número do proprietário (padrão) - já limpo para formato internacional (sem '+')
$defaultTo = '+55 98 8536-5002';

// Se o cliente enviou um número 'to' via payload, usa; caso contrário, usa o padrão
$to = isset($input['to']) && preg_replace('/\D/', '', $input['to']) ? preg_replace('/\D/', '', $input['to']) : $defaultTo;

$clientName = isset($input['clientName']) ? $input['clientName'] : '';
$serviceName = isset($input['serviceName']) ? $input['serviceName'] : '';
$date = isset($input['date']) ? $input['date'] : '';
$time = isset($input['time']) ? $input['time'] : '';
$phone = isset($input['phone']) ? $input['phone'] : '';
$note = isset($input['note']) ? $input['note'] : '';

// Monta a mensagem (personalize conforme desejar)
$message = "📅 *Novo Agendamento - Divino Pente* \\n\\n" .
           "👤 *Cliente:* " . $clientName . "\\n" .
           "✂️ *Serviço:* " . $serviceName . "\\n" .
           "📅 *Data:* " . $date . "\\n" .
           "⏰ *Horário:* " . $time . "\\n" .
           "📞 *Telefone:* " . $phone . "\\n\\n" .
           "📝 *Observações:* " . ($note ?: 'Nenhuma') . "\\n\\n" .
           "_Agendamento realizado via sistema_";

// Endpoint UltraMsg - ajuste conforme documentação da sua conta UltraMsg
$url = "https://api.ultramsg.com/$instance/messages/chat";

// Dados POST
$postFields = array(
    'token' => $token,
    'to' => $to,
    'body' => $message
);

// Inicializa cURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postFields));
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/x-www-form-urlencoded'));

$response = curl_exec($ch);
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr = curl_error($ch);
curl_close($ch);

// Retorna resposta apropriada
if ($response === false) {
    echo json_encode(array('success' => false, 'message' => 'Erro cURL: ' . $curlErr));
    http_response_code(500);
} else {
    echo json_encode(array('success' => ($httpcode >= 200 && $httpcode < 300), 'http_code' => $httpcode, 'response' => $response));
}
?>