import { auth, db } from "./src/firebase/config.js";

import { 
    onAuthStateChanged 
} from "firebase/auth";

import { 
    collection,
    query,
    where,  
    getDocs
} from "firebase/firestore";



const historialContainer = 
document.getElementById("historialContainer");



onAuthStateChanged(auth, async(user)=>{


    if(user){


        try{


            const q = query(
                collection(db,"reservas"),
                where("uid","==",user.uid)
            );


            const resultado = await getDocs(q);



            let reservas = [];


            resultado.forEach((doc)=>{


                reservas.push({

                    id:doc.id,
                    ...doc.data()

                });


            });



            // Solo mostrar terminadas
            const historial = reservas.filter(
                reserva =>
                reserva.estado === "finalizada" ||
                reserva.estado === "cancelada"
            );



            mostrarHistorial(historial);



        }catch(error){

            console.error(
                "Error cargando historial:",
                error
            );


            historialContainer.innerHTML=
            `
            <p>
            Error al cargar historial
            </p>
            `;

        }



    }else{


        window.location.href="login.html";


    }


});




function mostrarHistorial(reservas){


    if(reservas.length===0){


        historialContainer.innerHTML=
        `
        <p>
        No tienes reservaciones anteriores.
        </p>
        `;


        return;


    }



    historialContainer.innerHTML="";



    reservas.forEach(reserva=>{


        let color;


        if(reserva.estado==="finalizada"){

            color="#10b981";

        }else{

            color="#ef4444";

        }




        historialContainer.innerHTML +=
        `

        <div class="historial-card">


            <h3>
             ${reserva.estacionamiento}
            </h3>


            <p>
            <b>Cajón:</b>
            ${reserva.espacio}
            </p>


            <p>
            <b>Fecha:</b>
            ${reserva.fecha}
            </p>


            <p>
            <b>Horario:</b>
            ${reserva.horario}
            </p>


            <p>
            <b>Duración:</b>
            ${reserva.duracion}
            </p>


            <p class="${reserva.estado === 'finalizada' 
? 'estado-finalizada' 
: 'estado-cancelada'}">

${reserva.estado.toUpperCase()}

</p>


        </div>


        `;


    });


}
