<?php
include 'conexion.php'; 

$cedula = $_POST['cedula'];
$asistio = $_POST['asistio'];

// VALIDAR SI YA SE REGISTRO
$query = "SELECT * FROM asistencias WHERE Identificacion = '$cedula'";
$result = mysqli_query($conn, $query);

if (mysqli_num_rows($result) > 0) {
    echo json_encode(['message' => 'Ya se registró la asistencia de esta persona.']);
} else {
    $num = $_POST['num'];
    $nombre = $_POST['nombre'];
    $acciones = $_POST['acciones'];
    $porcentaje = $_POST['porcentaje'];
	$observaciones = $_POST['observaciones'];


    $insert = "INSERT INTO asistencias (Numero, Nombre,Identificacion, Acciones, Porcentaje, Asistio, Observaciones)
               VALUES ('$num', '$nombre','$cedula', '$acciones', '$porcentaje', '$asistio', '$observaciones')";
    if (mysqli_query($conn, $insert)) {
        echo json_encode(['message' => 'Asistencia registrada exitosamente.']);
    } else {
        echo json_encode(['message' => 'Error al registrar asistencia.']);
    }
}
?>