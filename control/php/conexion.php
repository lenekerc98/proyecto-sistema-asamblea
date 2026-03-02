<?php

$servidor="127.0.0.1";
$usuario_bd="root";
$clave_bd="";
$base_datos="asamblea_2025";

$conn=mysqli_connect($servidor,$usuario_bd,$clave_bd);

if(!$conn)
{
	die('no se pudo conectar a la base'.mysqli_error());
}
$conexion = new mysqli("localhost", "root", "", "asamblea_2025");

if ($conexion->connect_error) {
    die("Conexión fallida: " . $conexion->connect_error);
}

mysqli_select_db($conn,$base_datos);
//echo "se pudo conectar";
?>
