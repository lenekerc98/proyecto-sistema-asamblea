<?php
require "conexion.php";

$pregunta = $_GET['pregunta'];

$sql = "SELECT votos_si, votos_no, votos_blanco FROM finalizar_votos WHERE id_pregunta = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $pregunta);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
	echo json_encode([
		"success" => true,
		"votos_si" => $row['votos_si'],
		"votos_no" => $row['votos_no'],
		"votos_blanco" => $row['votos_blanco']
	]);
} else {
	echo json_encode(["success" => false]);
}
?>
