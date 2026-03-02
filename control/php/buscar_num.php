<?php
include("conexion.php");

$numero = $_POST['numero_server'];

// BUSCAR ACCIONISTA
$sql = "SELECT Nombre, Acciones FROM asistencias WHERE Numero = '$numero'";
$result = mysqli_query($conn, $sql);

if ($row = mysqli_fetch_assoc($result)) {
    $nombre = $row["Nombre"];
    $acciones = $row["Acciones"];

    // CALCULAR TOTAL DE ACCIONES
    $sql_total = "SELECT SUM(Acciones) AS total FROM asistencias";
    $result_total = mysqli_query($conn, $sql_total);
    $row_total = mysqli_fetch_assoc($result_total);
    $total_acciones = $row_total["total"];

    // CALCULAR EL PORCENTAJE DE ACCIONES
    $porcentaje = ($acciones / $total_acciones) * 100;

    // DEVOLVER LOS DATOS UNA
    echo json_encode([
        "p_validar" => 1,
        "nombre" => $nombre,
        "acciones" => $acciones,
        "total_acciones" => $total_acciones,
        "porcentaje" => number_format($porcentaje, 3) // LIMITAR EL PORCENTAJE A 3 DECIMALES
    ]);
} else {
    echo json_encode([
        "p_validar" => 0,
        "p_mensaje" => "No se encontró el accionista."
    ]);
}
?>
