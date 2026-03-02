<?php
include("conexion.php");

$cedula = $_POST['cedula'];
$observacion = $_POST['observacion'];

if ($cedula && $observacion !== null) {
    $query = "UPDATE asistencias SET Observaciones = ? WHERE Identificacion = ?";
    $stmt = mysqli_prepare($conn, $query);
    mysqli_stmt_bind_param($stmt, "ss", $observacion, $cedula);
    $result = mysqli_stmt_execute($stmt);

    if ($result) {
        echo json_encode(["success" => true, "message" => "Observación actualizada correctamente."]);
    } else {
        echo json_encode(["success" => false, "message" => "Error al actualizar observación."]);
    }

    mysqli_stmt_close($stmt);
} else {
    echo json_encode(["success" => false, "message" => "Datos incompletos."]);
}

mysqli_close($conn);
?>
