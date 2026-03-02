<?php
include("conexion.php");

$buscador = $_POST['buscador_server'] ?? '';

// BUSCAR EN LA TABLA PRINCIPAL LLAMADA REGISTRO
$sql = "SELECT Numero, Accionista AS nombre, Identificacion AS cedula, Acciones, Porcentaje 
        FROM registro 
        WHERE Accionista LIKE '%$buscador%' OR Identificacion LIKE '%$buscador%'";

$resultado = $conexion->query($sql);
$datos = [];

if ($resultado && $resultado->num_rows > 0) {
    while ($fila = $resultado->fetch_assoc()) {
        $cedula = $fila['cedula'];

        // BUSCAR SI YA EXISTE UN REGISTRO CON ESE ACCIONISTA
        $consultaAsist = "SELECT Asistio, Observaciones FROM asistencias WHERE Identificacion = '$cedula' LIMIT 1";
        $resAsist = $conexion->query($consultaAsist);

        $asistio = 0;
        $observaciones = "";

        if ($resAsist && $resAsist->num_rows > 0) {
            $rowAsist = $resAsist->fetch_assoc();
            $asistio = $rowAsist['Asistio'];
            $observaciones = $rowAsist['Observaciones'];
        }

        $datos[] = [
            'numero' => $fila['Numero'],
            'nombre' => $fila['nombre'],
            'cedula' => $fila['cedula'],
            'acciones' => $fila['Acciones'],
            'porcentaje' => $fila['Porcentaje'],
            'asistio' => $asistio,
            'observaciones' => $observaciones
        ];
    }
}

echo json_encode($datos);
?>
