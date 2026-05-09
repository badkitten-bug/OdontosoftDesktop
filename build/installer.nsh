; Custom NSIS hooks para el instalador de OdontoSoft Desktop.
;
; Estos macros los invoca electron-builder en momentos específicos del
; ciclo de instalación/desinstalación. Aquí los usamos para forzar el
; cierre de cualquier instancia previa de la app antes de continuar.
;
; Razón: si el cliente actualiza desde una versión anterior y la app
; está abierta (o quedó como proceso fantasma tras un crash), NSIS
; abortaría la instalación con "No se puede cerrar la aplicación".
; Esto rompe la UX de los clientes y nos genera tickets de soporte
; innecesarios. Mejor matarla en silencio.

!macro customInit
  DetailPrint "Cerrando instancias previas de OdontoSoft Desktop si las hay..."
  ; /F = force, /T = matar procesos hijos también, /IM = por nombre de imagen.
  ; Redirigimos stderr a NUL para que nunca aparezca un mensaje feo al usuario
  ; aunque no haya procesos que matar (taskkill devuelve error en ese caso).
  nsExec::Exec 'cmd /c taskkill /F /T /IM "OdontoSoft Desktop.exe" >nul 2>&1'
  Pop $0
  ; Pequeña espera para que Windows libere los locks de los archivos.
  Sleep 1500
!macroend

!macro customUnInit
  DetailPrint "Cerrando OdontoSoft Desktop antes de desinstalar..."
  nsExec::Exec 'cmd /c taskkill /F /T /IM "OdontoSoft Desktop.exe" >nul 2>&1'
  Pop $0
  Sleep 1000
!macroend
