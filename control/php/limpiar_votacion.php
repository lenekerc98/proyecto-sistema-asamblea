<?php
include 'conexion.php'; 

if (isset($_POST['pregunta'])) {
	$pregunta = $_POST['pregunta'];

	// SELECCIONAR LA TABLA CORRESPONDIENTE A LA PREGUNTA
	$tabla = "pregunta" . $pregunta; // ESTO SE LEE COMO LOS NOMBRES DE LAS TABLAS PREGUNTA1, PREGUNTA2, ETC.

	// CONSULTA PARA PROCEDER A LA ELIMINACION DE LOS REGISTROS
	$sql = "DELETE FROM " . $tabla . " WHERE 1";  
	
	if ($conn->query($sql) === TRUE) {
		echo json_encode(['success' => true, 'message' => 'Registros eliminados correctamente.']);
	} else {
		echo json_encode(['success' => false, 'message' => 'Error al eliminar registros: ' . $conn->error]);
	}

	$conn->close();
} else {
	echo json_encode(['success' => false, 'message' => 'No se recibió la pregunta.']);
    }
?>
