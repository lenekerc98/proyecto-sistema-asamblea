<?php
include("conexion.php");

$numero = $_POST['numero'];
$nombre = $_POST['nombre'];
$acciones = $_POST['acciones'];
$porcentaje_voto = $_POST['porcentaje_voto'];
$porcentaje_si = $_POST['porcentaje_si'];
$porcentaje_no = $_POST['porcentaje_no'];
$porcentaje_blanco = $_POST['porcentaje_blanco'];
$pregunta = $_POST['pregunta'];

// SE ARMA EL NOMBRE DE LA TABLA CON VALIDACION BASICA
$tabla = "pregunta" . intval($pregunta); // FUERZA A NUMERO

// VERIFICAR SI YA VOTO
$stmt = $conn->prepare("SELECT * FROM $tabla WHERE Numero = ?");
$stmt->bind_param("s", $numero);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    // SE ACTUALIZA EL VOTO
    $update = $conn->prepare("UPDATE $tabla SET 
                              Porcentaje = ?, 
                              Porcentaje_S = ?, 
                              Porcentaje_N = ?, 
                              Porcentaje_B = ? 
                              WHERE Numero = ?");
    $update->bind_param("ddddd", $porcentaje_voto, $porcentaje_si, $porcentaje_no, $porcentaje_blanco, $numero);
    if ($update->execute()) {
        echo json_encode(['p_mensaje' => 'Voto actualizado correctamente', 'p_validar' => 1]);
    } else {
        echo json_encode(['p_mensaje' => 'Error al actualizar voto', 'p_validar' => 0]);
    }
} else {
    // NO HA VOTADO ENTONCES SE INSERTA EN LA TABLA EL VOTO CON TODOS LOS REGISTROS
    $insert = $conn->prepare("INSERT INTO $tabla (Numero, Accionista, Acciones, Porcentaje, Porcentaje_S, Porcentaje_N, Porcentaje_B) 
                              VALUES (?, ?, ?, ?, ?, ?, ?)");
    $insert->bind_param("ssidddd", $numero, $nombre, $acciones, $porcentaje_voto, $porcentaje_si, $porcentaje_no, $porcentaje_blanco);
    if ($insert->execute()) {
        echo json_encode(['p_mensaje' => 'Voto registrado correctamente', 'p_validar' => 1]);
    } else {
        echo json_encode(['p_mensaje' => 'Error al registrar voto', 'p_validar' => 0]);
    }
}
?>
