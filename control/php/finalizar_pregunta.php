<?php
include("conexion.php");

$pregunta = $_POST['pregunta'] ?? 'NO_RECIBIDO';
$votos_si = $_POST['votos_si'] ?? 'NO_RECIBIDO';
$votos_no = $_POST['votos_no'] ?? 'NO_RECIBIDO';
$votos_blanco = $_POST['votos_blanco'] ?? 'NO_RECIBIDO';

file_put_contents("debug_log.txt", "PREGUNTA=$pregunta | SI=$votos_si | NO=$votos_no | BLANCO=$votos_blanco\n", FILE_APPEND);

$response = [];

// VERIFICAR SI YA EXISTE UN REGISTRO PARA LA PREGUNTA
$query = "SELECT * FROM finalizar_votos WHERE id_pregunta = ?";
$stmt = $conn->prepare($query);
$stmt->bind_param("i", $pregunta);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    // SI EXISTE UN REGISTRO ACTUALIZAMOS LOS VALORES
    $updateQuery = "UPDATE finalizar_votos SET Votos_Si = ?, Votos_No = ?, Votos_Blanco = ? WHERE id_pregunta = ?";
    $updateStmt = $conn->prepare($updateQuery);
    $updateStmt->bind_param("dddi", $votos_si, $votos_no, $votos_blanco, $pregunta);

    if ($updateStmt->execute()) {
        $response['p_validar'] = "1";
        $response['p_mensaje'] = "Votos actualizados correctamente";
    } else {
        $response['p_validar'] = "0";
        $response['p_mensaje'] = "Error SQL al actualizar: " . $updateStmt->error;
    }
    $updateStmt->close();
} else {
    // SI NO EXISTE EL REGISTRO LO INSERTAMOS
    $insertQuery = "INSERT INTO finalizar_votos (id_pregunta, Votos_Si, Votos_No, Votos_Blanco) VALUES (?, ?, ?, ?)";
    $insertStmt = $conn->prepare($insertQuery);
    $insertStmt->bind_param("iddd", $pregunta, $votos_si, $votos_no, $votos_blanco);

    if ($insertStmt->execute()) {
        $response['p_validar'] = "1";
        $response['p_mensaje'] = "Votos guardados correctamente";
    } else {
        $response['p_validar'] = "0";
        $response['p_mensaje'] = "Error SQL al guardar: " . $insertStmt->error;
    }
    $insertStmt->close();
}

$stmt->close();

echo json_encode($response);
?>
