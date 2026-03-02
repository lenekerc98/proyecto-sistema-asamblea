<?php


header('Content-Type: application/json');

include 'conexion.php';

$sql_total = "SELECT SUM(Porcentaje) AS total FROM asistencias WHERE Asistio = 1";
$resultado = $conexion->query($sql_total);

if ($resultado && $fila = $resultado->fetch_assoc()) {
    $total = round($fila['total'], 2); // Redondea a 2 decimales
    echo json_encode(["porcentaje_total" => $total]);
} else {
    echo json_encode(["porcentaje_total" => 0]);
}

$conexion->close();
?>
