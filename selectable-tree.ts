export const template = document.createElement('template');
template.innerHTML = `
  <style>
    ul{
      list-style: none;
      list-style-type: none;
      position: relative;
    }
    .container {
      display: flex;
      align-items: center;
      flex-direction: column;
    }
    .checkbox-input-wrapper {
      display: flex;
    }
    input[type="checkbox"].checkbox-effect {
      position: relative;
      width: 15px;
      height: 15px;
      color: black;
      border: 1px solid #ddd;
      border-radius: 4px;
      appearance: none;
      outline: 0;
      cursor: pointer;
      transition: background 175ms cubic-bezier(0.1, 0.1, 0.25, 1);
    }
    input[type="checkbox"].checkbox-effect::before{
      position: absolute;
      content: '';
      display: inline-block;
      top: 0px;
      left: 4px;
      width: 3px;
      height: 9px;
      border-style: solid;
      border-color: white;
      opacity: 0;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }
    input[type="checkbox"].checkbox-effect:checked, input[type="checkbox"].checkbox-effect:indeterminate {
      color: white;
      border-color: #51a5e1;
      background: #51a5e1;
    }
    input[type="checkbox"].checkbox-effect:checked::before {
      opacity: 1;
    }    
    input[type="checkbox"].checkbox-effect:indeterminate::before {
      top: 2px;
      left: 5px;
      opacity: 1;
      width: 1px;
      height: 8px;
      border-width: 0 2px 0 0;
      transform: rotate(90deg);
    }    
    .arrow {
      margin-left: -17px;
      width: 16px;
      height: 16px;
      z-index:1;
      cursor: pointer;
    }
    .custom-label {
      margin-left: 5px;
      font-size: 14px;
      cursor: pointer;
    }
    svg {
      stroke: #919298;
    }
    .vertical-line::before {
      content:"";
      display: inline-block;
      width: 2px;
      background: #e2e2e7;
      position: absolute;
      height: calc(100% - 25px);
      left: 30px;
      top: 19px;
    }
  </style>
`;

const arrowTemplate = document.createElement('template');
arrowTemplate.innerHTML = `
    <div class="arrow">
      <svg class="arrow-svg" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 16 16">
      <path stroke-width="2" fill-rule="nonzero" d="M8,11.5a.47.47,0,0,1-.35-.15l-6.5-6.5a.48.48,0,0,1,0-.7.48.48,0,0,1,.7,0L8,10.29l6.15-6.14a.49.49,0,0,1,.7.7l-6.5,6.5A.47.47,0,0,1,8,11.5Z"></path></svg>
    </div>
`

/**
 * Interface that represents the node tree.
 */
interface NodeItem {
  id: string;
  name: string;
  children?: NodeItem[]
}

/**
 * Enum for node states.
 */
enum NodeState {
  CHECKED = 'checked',
  UNCHECKED = 'unchecked',
  PARTIAL_CHECK = 'partiallyChecked'
}

/**
 * Web component that genarates a selectable tree.
 * The component triggers a custom DOM event at each change of the state of a node of the tree data. Each node can have 3
 * states: checked, partially checked and unchecked.
 * 
 * It is possible to fold or unfold the nodes by clicking on the parent name or the arrow, when it has children.
 * 
 * Example of usage of web component:
 * const data = [
 *    {
 *      "name": "Documents",
 *      "id": "1",
 *      "children": [
 *        {
 *          "name": "Projects",
 *          "id": "2",
 *          "children": [
 *            {
 *              "name": "Test 1",
 *              "id": "3",
 *              "children": []
 *            },
 *            {
 *              "name": "Images",
 *              "id": "4",
 *              "children": []
 *            }
 *          ]
 *        }
 *      ]
 *    },
 *    {
 *      "name": "Desktop",
 *      "id": "6",
 *      "children": []
 *    },
 *    {
 *      "name": "Downloads",
 *      "id": "11",
 *      "children": []
 *    }
 *  ]
 * 
 * <selectable-tree data={JSON.stringify(data)}></selectable-tree>
 * 
 * Pre-requisites for the data:
 * - Tree nodes items id parameter must be unique.
 * 
 * 
 */
export class SelectableTree extends HTMLElement {

  get data(): string | null {
    return this.getAttribute('data');
  }

  static get observedAttributes(): string[] {
    return ['data']
  }

  get checked(): boolean {
    return this.hasAttribute('checked');
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot?.appendChild(template.content.cloneNode(true));
  }

  /**
   * Executed when element is connected to document DOM.
   */
  connectedCallback() {
    if (this.data !== null && this.shadowRoot) {
      const nodes = JSON.parse(this.data);
      if (nodes.legnth !== 0) {
        this.recursiveNodeCreation(nodes, this.shadowRoot);
      }
    }
  }

  /**
   * Excecuted on change of data attribute.
   * 
   * @param attrName changed attribute name.
   * @param oldVal old attribute value.
   * @param newVal new attribute value.
   */
  attributeChangedCallback(attrName: string, oldVal: string, newVal: string) {
    if (attrName === 'data' && oldVal !== newVal && this.data !== null && this.shadowRoot && oldVal !== null) {
      const nodes = JSON.parse(this.data);
      if (nodes.legnth !== 0) {
        this.recursiveNodeCreation(nodes, this.shadowRoot as ShadowRoot);
      }
    }
  }

  /**
   * Recursive creation of the HTML Element of the nodes tree.
   * 
   * @param nodes Array of nodes.
   * @param parentNode The HTMLElement to where node will be appended
   */
  private recursiveNodeCreation(nodes: NodeItem[], parentNode: HTMLElement | ShadowRoot): void {
    const elementUL = document.createElement('ul');
    parentNode.appendChild(elementUL);
    nodes.forEach((item: NodeItem) => {
      const element = this.getNodeHTMLElement(item, elementUL);
      elementUL.appendChild(element);
      if (item.children !== undefined && item.children.length !== 0) {
        this.recursiveNodeCreation(item.children, element);
      }
    });
  }

  /**
   * Constructs the HTML element of the collapsable arrow, label and checkbox that represents a selectable item.
   * Adds event listener to checkbox and input responsible for collapse tree node and set state of checkbox.
   * 
   * @param item The node item
   * @param elementUL The UL element that contains the node item.
   * @returns Returns the HTML element with the collapsable arrow, the label and checkbox.
   */
  private getNodeHTMLElement(item: NodeItem, elementUL: HTMLElement): HTMLElement {
    const nodeWrapper = document.createElement('li');
    const checkboxWrapper = document.createElement('div');

    checkboxWrapper.classList.add('checkbox-input-wrapper');
    checkboxWrapper.id = item.id;

    this.generateCollapsableArrow(item, checkboxWrapper, elementUL);

    const input = document.createElement('input');
    input.setAttribute('type', 'checkbox');
    input.setAttribute('state', NodeState.UNCHECKED);
    input.classList.add('checkbox-effect');
    input.id = item.id;


    input.addEventListener('click', (event) => {
      this.updateTreeStateFromClick(event);
      // If node is collapsed, uncollapse for improved UX.
      // if (arrowSVG !== null && arrowSVG !== undefined) {
      //   if ((checkboxWrapper.parentElement as HTMLElement).querySelector('ul')?.style.display === 'none') {
      //     this.showItemView((checkboxWrapper.parentElement as HTMLElement), arrowSVG);
      //   }
      // }
    });

    const label = document.createElement('label');
    label.classList.add('custom-label');

    label.setAttribute('for', `${item.id}`);
    label.innerHTML = item.name;
    const arrowSVG = checkboxWrapper.getElementsByClassName('arrow-svg')[0] as HTMLElement;
    label.addEventListener('click',
      () => this.toggleNodeView(checkboxWrapper.parentElement as HTMLElement, arrowSVG));

    checkboxWrapper.appendChild(input);
    checkboxWrapper.appendChild(label);
    nodeWrapper.appendChild(checkboxWrapper);
    return nodeWrapper;
  }

  /**
   * Update tree nodes checkboxes states according to click event.
   * Will update the children nodes of the event target triggering the event and
   * will update the parent node of the event target triggering the event.
   * @param event Click DOM event.
   */
  private updateTreeStateFromClick(event: Event): void {
    const inputElement = event.target as HTMLInputElement;

    const targetLiElement = inputElement.parentElement?.parentElement;
    this.updateChildrenStateFromParent(targetLiElement as HTMLLIElement);

    const targetParentLiElement = targetLiElement?.parentElement?.parentElement;
    this.updateParentStateFromChildren(targetParentLiElement);
    // Clicked checkbox shall never stay as indeterminate.
    inputElement.indeterminate = false;
  }

  /**
   * Update children nodes state according to clicked checkbox new state.
   * @param liElement List element of the clicked checkbox.
   */
  private updateChildrenStateFromParent(liElement: HTMLLIElement): void {
    // Select all <ul> unordered list children nodes
    const nodeChildren = liElement.querySelector('ul');

    if (nodeChildren !== undefined && nodeChildren !== null) {
      const childrenInputsArray = Array.from(nodeChildren.querySelectorAll('input'));
      const childrenState = this.getChildrenState(childrenInputsArray);
      if (childrenState === NodeState.CHECKED) {
        // If all are checked, set all children to unchecked.
        childrenInputsArray.forEach(child => {
          this.applyStateToCheckbox(child, NodeState.UNCHECKED);
          this.dispatchEventOutput(child, NodeState.UNCHECKED);
        });
      } else {
        // If none are checked or at least on is checked, set all childreen to checked.
        childrenInputsArray.forEach(child => {
          this.applyStateToCheckbox(child, NodeState.CHECKED);
          this.dispatchEventOutput(child, NodeState.CHECKED);
        });
      }
    }
  }

  /**
   * Update parent list element according to clicked checkbox state.
   * @param parentLiElement Parent list element of clicked checkbox.
   */
  private updateParentStateFromChildren(parentLiElement: HTMLElement | undefined | null): void {
    if (parentLiElement !== undefined && parentLiElement !== null) {
      const nodeChildren = parentLiElement.querySelector('ul');
      const parentLiCheckboxElement = parentLiElement.querySelector('div input') as HTMLInputElement;

      if (nodeChildren !== undefined && nodeChildren !== null) {
        const childrenInputsArray = Array.from(nodeChildren.querySelectorAll('input'));
        const childrenState = this.getChildrenState(childrenInputsArray);
        if (childrenState === NodeState.CHECKED) {
          // If all children are checked, set parent to checked state.
          this.applyStateToCheckbox(parentLiCheckboxElement, NodeState.CHECKED);
          this.dispatchEventOutput(parentLiCheckboxElement, NodeState.CHECKED)
        } else if (childrenState === NodeState.PARTIAL_CHECK) {
          // IF at least one children is checked, set parent to partialy checked state
          this.applyStateToCheckbox(parentLiCheckboxElement, NodeState.PARTIAL_CHECK);
          this.dispatchEventOutput(parentLiCheckboxElement, NodeState.PARTIAL_CHECK)
        } else {
          // if no children are checked, set parent to unchecked.
          this.applyStateToCheckbox(parentLiCheckboxElement, NodeState.UNCHECKED);
          this.dispatchEventOutput(parentLiCheckboxElement, NodeState.UNCHECKED)
        }
        // Recursively call the update.
        this.updateParentStateFromChildren(parentLiElement.parentElement?.parentElement);
      }
    }
  }

  /**
   * Applies the attribute checked and indeterminate of element based on checkbox state.
   * @param element The input that had its state changed.
   * @param newState The new state of the input.
   */
  private applyStateToCheckbox(element: HTMLInputElement, newState: NodeState) {
    switch (newState) {
      case NodeState.CHECKED:
        element.checked = true;
        element.indeterminate = false;
        break;
      case NodeState.PARTIAL_CHECK:
        element.checked = false;
        element.indeterminate = true;
        break;
      case NodeState.UNCHECKED:
        element.checked = false;
        element.indeterminate = false;
        break;
    }
  }

  /**
   * Triggers a DOM eventat each change of the state of a node of the tree data.
   * @param node The input that had its state changed.
   * @param newState The new state of the input. 
   */
  private dispatchEventOutput(node: HTMLInputElement, newState: NodeState): void {
    if (newState !== node.getAttribute('state')) {
      document.dispatchEvent(new CustomEvent("treeNodeUpdate", {
        detail: {
          id: node.id,
          newState: newState,
        },
        composed: true,
        bubbles: true,
      }));
      node.setAttribute('state', newState);
    }
  }

  /**
   * Returns state of all children checkboxes.
   * @param childrenNodes Array of HTMLInputElements
   * @returns NodeState or undefined.
   */
  private getChildrenState(childrenNodes: Array<HTMLInputElement>): NodeState | undefined {
    if (childrenNodes !== undefined && childrenNodes !== null) {
      const testAtLeastOneChildrenChecked = childrenNodes.some(item => item.checked);
      const testAllChildrenChecked = childrenNodes.every(item => item.checked);
      if (testAllChildrenChecked) {
        return NodeState.CHECKED;
      } else if (testAtLeastOneChildrenChecked) {
        return NodeState.PARTIAL_CHECK;
      } else {
        return NodeState.UNCHECKED;
      }
    }
  }

  /**
   * Creates the collapsable arrow element.
   * 
   * @param item Node item
   * @param checkboxInputWrapper The parent of the collapsable arrow.
   * @param liNode The LI node that contains the checkboxInputWrapper.
   */
  private generateCollapsableArrow(item: NodeItem, checkboxInputWrapper: HTMLElement, liNode: HTMLElement): void {
    if (item.children !== undefined && item.children.length !== 0) {
      checkboxInputWrapper.appendChild(arrowTemplate.content.cloneNode(true));
      const arrowSVG = checkboxInputWrapper.getElementsByClassName('arrow-svg')[0] as HTMLElement;
      liNode.classList.add('vertical-line');
      arrowSVG.addEventListener('click',
        () => this.toggleNodeView(checkboxInputWrapper.parentElement as HTMLElement, arrowSVG));
    }
  }

  /**
  * Toggles the visibility of the node.
  */
  private toggleNodeView(element: HTMLElement, expandElement: HTMLElement | null | undefined): void {
    if (expandElement !== null && expandElement !== undefined) {
      element.querySelector('ul')?.style.display === 'none' ?
        this.showItemView(element, expandElement) : this.hideItemView(element, expandElement);
    }
  }

  /**
   * Rotates the expand icon and display the sub nodes.
   */
  private showItemView(element: HTMLElement, expandElement: HTMLElement): void {
    expandElement.style.removeProperty('transform');
    element.querySelector('ul')?.style.removeProperty('display');
  }

  /**
   * Hides the children and re-initializes the expand icon orientation.
   */
  private hideItemView(element: HTMLElement, expandElement: HTMLElement): void {
    expandElement.style.setProperty('transform', 'rotate(-90deg)');
    element.querySelector('ul')?.style.setProperty('display', 'none');
  }
}

window.customElements.define('selectable-tree', SelectableTree);