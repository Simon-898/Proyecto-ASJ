package cl.papa.ordenes;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class SpaController {

  @RequestMapping(value = { "/", "/ordenes", "/estadisticas", "/visitas" })
  public String forward() {
    return "forward:/index.html";
  }
}
