<?php
include 'conexion.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $cedula = $_POST['cedula'] ?? '';

    if (empty($cedula)) {
        echo json_encode(['success' => false, 'message' => 'La cédula no puede estar vacía.']);
        exit;
    }

    // CONSULTA PARA ELIMINAR EL REGISTRO EN LA TABLA ASISTENCIAS
    $query = "DELETE FROM asistencias WHERE Identificacion = ?";
    $stmt = $conn->prepare($query);

    if ($stmt === false) {
        echo json_encode(['success' => false, 'message' => 'Error al preparar la consulta.']);
        exit;
    }

    $stmt->bind_param("s", $cedula);
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Asistencia eliminada correctamente.']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error al eliminar la asistencia.']);
    }

    $stmt->close();
} else {
    echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
}
?>
