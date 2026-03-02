<?php 

include 'conexion.php';

$numero =$_POST['numero_server'];
$nombre = $_POST['nombre_server'];
$cedula = $_POST['cedula_server'];
$acciones = $_POST['acciones_server'];
$porcentaje = $_POST['porcentaje_server'];


$query = "insert into registro(Numero,Accionista,Identificacion,Acciones,Porcentaje) values 
('$numero','$nombre','$cedula','$acciones','$porcentaje')";

$resultado =  $conn->query($query);

if ($resultado == TRUE) 
{
	echo json_encode(array('p_mensaje'=>'Registro Exitoso','p_validar'=>'1'));
	return;
}
	else{
	echo json_encode(array('p_mensaje'=>'Error Mysql','p_valida'=>'0'));
	return;
}
?>



